import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const systemPrompt = `Você é Santo Antônio AI, assistente de apoio sanitário para uma granja de suínos no Brasil. Você NÃO é médico-veterinário e NÃO diagnostica nem prescreve. Sua função é organizar sinais observados, indicar hipóteses diferenciais para avaliação profissional, identificar sinais de urgência, sugerir perguntas e medidas gerais de manejo seguro, e consultar os medicamentos cadastrados como inventário informativo.

REGRAS INEGOCIÁVEIS:
1. Nunca prescreva, escolha um medicamento como tratamento definitivo, indique dose, ml, mg/kg, frequência, via ou duração. Nunca calcule dose. Mesmo que o estoque mostre produto compatível, apresente apenas informações cadastrais para o veterinário avaliar.
2. Nunca infira peso ou idade. Se dose depender de peso, diga que é informação ausente e que o cálculo é responsabilidade do veterinário com base na bula e prescrição.
3. Estoque disponível, princípio ativo ou nome comercial não provam indicação. Não recomende uso por disponibilidade. Lotes vencidos devem ser identificados como vencidos e jamais apresentados como opção de uso.
4. Não diagnostique por foto ou descrição. Descreva apenas achados visíveis e limitações.
5. Se houver mortalidade súbita, vários animais gravemente doentes, dificuldade respiratória intensa, sinais neurológicos, suspeita de doença de notificação ou intoxicação, classifique como URGENTE e recomende contato imediato com médico-veterinário e serviço oficial quando aplicável. Não orientar movimentação/abate/venda.
6. Recomendações gerais devem priorizar observação, água limpa disponível, conforto ambiental, redução de estresse e isolamento somente quando tecnicamente indicado e seguro, sem manobras arriscadas.
7. Cite quando os dados são insuficientes. Não invente referências, bula, carência ou eficácia.
8. Não considere hipótese anterior como diagnóstico confirmado. Diferencie observação, hipótese e diagnóstico veterinário.
9. Responda em português brasileiro, linguagem clara para trabalhadores de granja.

Retorne JSON válido com este formato:
{
 "summary":"resumo objetivo",
 "urgency":"rotina|atencao|rapida|urgente",
 "observed_signs":["..."],
 "possible_causes":[{"name":"...","reason":"...","confidence":"baixa|moderada|alta","not_a_diagnosis":true}],
 "questions_to_ask":["..."],
 "safe_actions":["..."],
 "veterinary_attention":"quando e por que chamar o veterinário",
 "tests_to_discuss":["..."],
 "inventory_review":[{"medicine":"nome cadastrado","stock_status":"...","expiry":"...","relevance_note":"apenas informação para avaliação veterinária; não é prescrição"}],
 "missing_information":["..."],
 "disclaimer":"Análise de apoio, não é diagnóstico nem prescrição. Toda decisão de tratamento deve ser validada pelo médico-veterinário."
}
Nunca acrescente texto fora do JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Autenticação necessária" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentAnalyses, error: rateError } = await supabase
      .from("ai_health_analyses")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id)
      .gte("created_at", windowStart);
    if (rateError) throw rateError;
    if ((recentAnalyses ?? 0) >= 30) {
      return new Response(JSON.stringify({ error: "Limite de 30 análises por hora atingido para esta conta. Registre os sinais e procure o veterinário se houver urgência." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const body = await req.json();
    if (body.image_url) {
      let imageUrl: URL;
      try { imageUrl = new URL(String(body.image_url)); } catch { return new Response(JSON.stringify({ error: "Endereço da imagem inválido." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } }); }
      const storageBase = new URL(supabaseUrl);
      if (imageUrl.origin !== storageBase.origin || !imageUrl.pathname.startsWith("/storage/v1/object/sign/veterinary-evidence/")) {
        return new Response(JSON.stringify({ error: "A imagem precisa estar no armazenamento privado de evidências da fazenda." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }
    const description = String(body.description ?? "").trim();
    if (description.length < 8 || description.length > 8000) return new Response(JSON.stringify({ error: "Descreva o caso com pelo menos 8 caracteres (máximo 8.000)." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    const [medsResult, lotsResult, eventsResult] = await Promise.all([
      supabase.from("farm_medications").select("id,name,active_ingredient,manufacturer,therapeutic_class,presentation,concentration,administration_routes,indications,contraindications,warnings,interactions,meat_withdrawal_days,requires_veterinary_prescription").order("name").limit(100),
      supabase.from("farm_medication_lots").select("medication_id,lot_number,expiry_date,quantity,unit").order("expiry_date").limit(300),
      supabase.from("health_events").select("event_date,sector,sign_group,clinical_signs,severity,affected_count,death_count,status").order("event_date",{ascending:false}).limit(30),
    ]);
    if (medsResult.error) throw medsResult.error;
    if (lotsResult.error) throw lotsResult.error;
    if (eventsResult.error) throw eventsResult.error;
    const lotsByMed = new Map<string, unknown[]>();
    for (const lot of lotsResult.data ?? []) lotsByMed.set(lot.medication_id, [...(lotsByMed.get(lot.medication_id) ?? []), lot]);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const inventory = (medsResult.data ?? []).map(m => ({
      ...m,
      lots: (lotsByMed.get(m.id) ?? []).map((lot: any) => ({
        ...lot,
        stock_status: lot.expiry_date && lot.expiry_date < today
          ? "VENCIDO — não utilizar nos animais"
          : Number(lot.quantity) > 0 ? "saldo cadastrado; uso depende de avaliação veterinária" : "sem saldo",
      })),
    }));
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "A integração de IA ainda não foi configurada. O administrador precisa cadastrar OPENAI_API_KEY como segredo da função." }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
    const context = {
      case: {
        description, sector: body.sector ?? null, production_phase: body.production_phase ?? null,
        pen_id: body.pen_id ?? null, animal_category: body.animal_category ?? null,
        affected_count: body.affected_count ?? null, animal_count: body.animal_count ?? null,
        onset_date: body.onset_date ?? null, severity_reported: body.severity_reported ?? null,
      },
      farm_inventory: inventory,
      recent_health_history: eventsResult.data ?? [],
      image_url: body.image_url ?? null,
    };
    const userContent: unknown[] = [{ type: "text", text: "Analise o caso abaixo usando apenas os dados disponíveis. Consulte o inventário como informação para o veterinário, nunca como prescrição. Dados da fazenda:\n" + JSON.stringify(context) }];
    if (typeof body.image_url === "string" && body.image_url.startsWith("https://")) userContent.push({ type: "image_url", image_url: { url: body.image_url, detail: "auto" } });
    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
      }),
    });
    if (!completion.ok) {
      const detail = await completion.text();
      console.error("AI provider error", completion.status, detail.slice(0, 1000));
      return new Response(JSON.stringify({ error: "O serviço de IA não conseguiu concluir a análise. Tente novamente mais tarde." }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const result = await completion.json();
    const raw = result.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Resposta vazia do serviço de IA");
    const parsed = JSON.parse(raw);
    const { data: saved, error: saveError } = await supabase.from("ai_health_analyses").insert({
      sector: body.sector ?? null, production_phase: body.production_phase ?? null,
      pen_id: body.pen_id || null, animal_category: body.animal_category ?? null,
      affected_count: body.affected_count ?? null, animal_count: body.animal_count ?? null,
      onset_date: body.onset_date || null, severity_reported: body.severity_reported ?? null,
      description, image_path: body.image_path ?? null, ai_response: parsed,
      model_name: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
    }).select("id").single();
    if (saveError) throw saveError;
    return new Response(JSON.stringify({ analysis: parsed, analysis_id: saved.id }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("vet-assistant error", error);
    return new Response(JSON.stringify({ error: "Não foi possível processar a análise. Verifique os dados e tente novamente." }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
