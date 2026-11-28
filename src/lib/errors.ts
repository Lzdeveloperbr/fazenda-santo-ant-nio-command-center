/**
 * Mensagens de erro em português claro. As regras do banco já escrevem mensagens próprias
 * (código P0001) e passam direto; erros técnicos conhecidos viram uma frase que o usuário entende.
 */
type Err = { message?: unknown; code?: unknown; details?: unknown } | null | undefined;

export const MISSING_SCHEMA_CODES = new Set([
  "42P01",
  "42703",
  "42883",
  "PGRST200",
  "PGRST202",
  "PGRST204",
  "PGRST205",
]);

export function isMissingSchema(e: Err): boolean {
  if (!e) return false;
  const code = typeof e.code === "string" ? e.code : "";
  const msg = typeof e.message === "string" ? e.message : "";
  return (
    MISSING_SCHEMA_CODES.has(code) || /schema cache|does not exist|could not find the/i.test(msg)
  );
}

export function friendlyError(
  e: unknown,
  fallback = "Não foi possível salvar. Tente de novo.",
): string {
  if (!e) return fallback;
  if (typeof e === "string") return e;
  const err = e as Err & object;
  const code = typeof err.code === "string" ? err.code : "";
  const msg = typeof err.message === "string" ? err.message : "";
  if (isMissingSchema(err))
    return "Esta função precisa da atualização do banco de dados. Avise o administrador (Configurações › Sistema).";
  if (code === "42501" || /row-level security|permission denied/i.test(msg))
    return "Seu perfil não tem permissão para esta ação.";
  if (code === "23505")
    return "Já existe um registro igual (por exemplo, o mesmo brinco ou a mesma data).";
  if (code === "23503")
    return "Este registro está ligado a outro que não existe mais ou pertence a outra granja.";
  if (code === "23514") return "Algum valor está fora do permitido. Confira os números e as datas.";
  if (code === "23502") return "Falta preencher um campo obrigatório.";
  if (code === "22P02" || code === "22007" || code === "22008")
    return "Algum campo está em formato inválido (número ou data).";
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg))
    return "Sem conexão com a internet. Confira o sinal e tente de novo.";
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg))
    return "Confirme o e-mail pelo link enviado antes de entrar.";
  if (/user already registered|already been registered/i.test(msg))
    return "Este e-mail já tem conta. Use Entrar ou Esqueci minha senha.";
  if (/password should be at least|weak password/i.test(msg))
    return "Senha fraca: use pelo menos 8 caracteres, com letras e números.";
  if (/rate limit|too many requests|security purposes/i.test(msg))
    return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
  if (/jwt|refresh token|not authenticated/i.test(msg)) return "Sua sessão expirou. Entre de novo.";
  return msg || fallback;
}
