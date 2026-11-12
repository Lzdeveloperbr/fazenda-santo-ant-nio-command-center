import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/farm/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Fazenda Santo Antônio" },
      { name: "description", content: "Acesso ao AgroTech Command Center da Fazenda Santo Antônio." },
      { property: "og:title", content: "Entrar | Fazenda Santo Antônio" },
      { property: "og:description", content: "Acesso restrito aos responsáveis pela fazenda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [farmCode, setFarmCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/painel", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("E-mail ou senha incorretos");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { display_name: name, farm_code: farmCode.trim().toUpperCase() } },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Conta criada. Confirme pelo link enviado ao seu e-mail.");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Não foi possível entrar com Google");
  }

  return (
    <main className="tech-grid flex min-h-screen items-center justify-center px-5 py-10">
      <div className="panel w-full max-w-sm animate-rise p-6">
        <Wordmark />
        <p className="label-tech mt-6">{mode === "in" ? "Autenticação" : "Novo operador"}</p>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {mode === "up" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Seu nome</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            </div>
          )}
          {mode === "up" && (
            <div className="space-y-1.5">
              <Label htmlFor="farm-code">Código da Fazenda Santo Antônio</Label>
              <Input id="farm-code" autoCapitalize="characters" value={farmCode} onChange={(e) => setFarmCode(e.target.value.toUpperCase())} className="h-11 font-mono tracking-wider" placeholder="SA-XXXXXXXX" />
              <p className="text-xs leading-5 text-muted-foreground">Peça o código ao responsável pela fazenda. Sem o código, a conta será criada sem acesso aos dados compartilhados.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Senha</Label>
            <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
          </div>
          <Button type="submit" disabled={busy} className="h-11 w-full">
            {mode === "in" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <Button variant="outline" onClick={google} className="mt-3 h-11 w-full">Continuar com Google</Button>
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground">
          {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
        </button>
        <p className="mt-4 text-center text-xs text-muted-foreground">Funcionários podem entrar com o código compartilhado pela administração da fazenda.</p>
      </div>
    </main>
  );
}
