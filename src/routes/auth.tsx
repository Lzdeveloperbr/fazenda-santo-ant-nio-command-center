import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Lock, Mail, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLockup, LogoMark } from "@/components/farm/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Fazenda Santo Antônio" },
      { name: "description", content: "Acesso ao Command Center da Fazenda Santo Antônio." },
      { property: "og:title", content: "Entrar | Fazenda Santo Antônio" },
      { property: "og:description", content: "Acesso restrito à equipe da fazenda." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "in" | "up" | "forgot" | "reset";
const TITLE: Record<Mode, { kicker: string; title: string }> = {
  in: { kicker: "Bem-vindo de volta", title: "Entrar na granja" },
  up: { kicker: "Primeiro acesso", title: "Criar sua conta" },
  forgot: { kicker: "Recuperação", title: "Esqueci minha senha" },
  reset: { kicker: "Recuperação", title: "Criar nova senha" },
};

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [name, setName] = useState("");
  const [farmCode, setFarmCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Link de recuperação: o Supabase abre a sessão e avisa com PASSWORD_RECOVERY.
    const recovering =
      typeof window !== "undefined" &&
      (window.location.hash.includes("type=recovery") ||
        new URLSearchParams(window.location.search).get("reset") === "1");
    if (recovering) setMode("reset");
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !recovering) navigate({ to: "/painel", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        return;
      }
      if (session && event === "SIGNED_IN" && !recovering)
        navigate({ to: "/painel", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) toast.error("E-mail ou senha incorretos");
      } else if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name, farm_code: farmCode.trim().toUpperCase() },
          },
        });
        if (error) toast.error(error.message);
        else if (!data.session)
          toast.success("Conta criada. Confirme pelo link enviado ao seu e-mail.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?reset=1`,
        });
        // Mesma mensagem com ou sem conta, para não revelar quais e-mails existem.
        if (error && !/rate|limit/i.test(error.message)) console.warn("reset", error.message);
        if (error && /rate|limit/i.test(error.message))
          toast.error("Muitas tentativas. Aguarde alguns minutos.");
        else
          toast.success(
            "Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.",
          );
      } else {
        if (password.length < 8) {
          toast.error("Use pelo menos 8 caracteres.");
          return;
        }
        if (password !== password2) {
          toast.error("As senhas não conferem.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error)
          toast.error(
            error.message.includes("session")
              ? "O link expirou. Peça um novo em “Esqueci minha senha”."
              : error.message,
          );
        else {
          toast.success("Senha alterada.");
          navigate({ to: "/painel", replace: true });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (r.error) toast.error("Não foi possível entrar com Google");
  }

  const t = TITLE[mode];
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* Painel da marca com a paisagem 3D */}
      <section className="brand-aurora relative hidden overflow-hidden text-white lg:flex lg:flex-col">
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <Link to="/" className="w-fit">
            <BrandLockup size="lg" animated={false} />
          </Link>
          <div className="max-w-md">
            <p className="text-sm font-semibold text-[#E3C77F]">Gestão completa da suinocultura</p>
            <h2 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight">
              Cada matriz, cada leitão, cada decisão — em um só lugar.
            </h2>
            <ul className="mt-7 space-y-3 text-sm text-white/80">
              {[
                [ShieldCheck, "Acesso por perfil e histórico de todas as alterações"],
                [Sparkles, "Santo Antônio AI responde com os dados da granja"],
                [KeyRound, "Funciona no celular, inclusive com internet instável"],
              ].map(([Icon, text]) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <li key={text as string} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                      <I className="h-4 w-4 text-[#E3C77F]" />
                    </span>
                    {text as string}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* Formulário */}
      <section className="relative flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="brand-aurora absolute inset-x-0 top-0 h-44 lg:hidden" />
        <div className="relative w-full max-w-md">
          <div className="mb-6 flex justify-center lg:hidden">
            <Link to="/">
              <LogoMark className="h-20 w-20 drop-shadow-[0_12px_28px_rgba(0,0,0,.35)]" />
            </Link>
          </div>
          <div className="panel animate-rise p-6 sm:p-8">
            <p className="text-[.68rem] font-bold uppercase tracking-[.2em] text-primary">
              {t.kicker}
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight">{t.title}</h1>
            {mode === "forgot" && (
              <p className="mt-2 text-sm text-muted-foreground">
                Informe seu e-mail. Enviaremos um link para você criar uma nova senha.
              </p>
            )}
            {mode === "reset" && (
              <p className="mt-2 text-sm text-muted-foreground">
                Escolha uma senha nova com pelo menos 8 caracteres.
              </p>
            )}
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "up" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Seu nome</Label>
                    <Input
                      id="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12"
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="farm-code">Código da Fazenda Santo Antônio</Label>
                    <Input
                      id="farm-code"
                      autoCapitalize="characters"
                      value={farmCode}
                      onChange={(e) => setFarmCode(e.target.value.toUpperCase())}
                      className="h-12 font-mono tracking-wider"
                      placeholder="SA-XXXXXXXX"
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      Peça o código ao responsável pela fazenda. Sem ele, a conta é criada sem
                      acesso aos dados.
                    </p>
                  </div>
                </>
              )}
              {mode !== "reset" && (
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>
              )}
              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pw">{mode === "reset" ? "Nova senha" : "Senha"}</Label>
                    {mode === "in" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="pw"
                      type="password"
                      required
                      minLength={mode === "in" ? 6 : 8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pl-10"
                      autoComplete={mode === "in" ? "current-password" : "new-password"}
                    />
                  </div>
                </div>
              )}
              {mode === "reset" && (
                <div className="space-y-1.5">
                  <Label htmlFor="pw2">Repita a nova senha</Label>
                  <Input
                    id="pw2"
                    type="password"
                    required
                    minLength={8}
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    className="h-12"
                    autoComplete="new-password"
                  />
                </div>
              )}
              <Button type="submit" disabled={busy} className="h-12 w-full text-base font-bold">
                {busy
                  ? "Aguarde…"
                  : mode === "in"
                    ? "Entrar"
                    : mode === "up"
                      ? "Criar conta"
                      : mode === "forgot"
                        ? "Enviar link"
                        : "Salvar nova senha"}
              </Button>
            </form>
            {(mode === "in" || mode === "up") && (
              <>
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  ou
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button variant="outline" onClick={google} className="h-12 w-full">
                  Continuar com Google
                </Button>
              </>
            )}
            <div className="mt-6 text-center text-sm">
              {mode === "in" && (
                <button
                  onClick={() => setMode("up")}
                  className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                >
                  <UserPlus className="h-4 w-4" />
                  Primeiro acesso? Criar conta
                </button>
              )}
              {mode !== "in" && (
                <button
                  onClick={() => setMode("in")}
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para entrar
                </button>
              )}
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Acesso restrito à equipe da Fazenda Santo Antônio.
          </p>
        </div>
      </section>
    </main>
  );
}
