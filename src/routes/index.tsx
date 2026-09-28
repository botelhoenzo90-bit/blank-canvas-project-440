import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BarChart3, BellRing, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createAccount, getInitialSignupAvailability } from "@/lib/auth.functions";
import { ThemeToggle } from "@/components/theme-toggle";
import logo from "@/assets/dabliu-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar | Dábliu Consórcios" },
      { name: "description", content: "Acesso seguro à Central de Resultados Dábliu Consórcios." },
      { property: "og:title", content: "Central de Resultados | Dábliu Consórcios" },
      { property: "og:description", content: "Acesso seguro à operação comercial Dábliu." },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content:
          "https://comercialdabliuconsorcios.lovable.app/__l5e/assets-v1/10f4a8ff-d9be-4747-8a78-befda610e55e/dabliu-share.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content:
          "https://comercialdabliuconsorcios.lovable.app/__l5e/assets-v1/10f4a8ff-d9be-4747-8a78-befda610e55e/dabliu-share.png",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const signup = useServerFn(createAccount);
  const checkInitialSignup = useServerFn(getInitialSignupAvailability);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [initialSignupAvailable, setInitialSignupAvailable] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/dashboard", replace: true });
    });
    void checkInitialSignup().then((result) => setInitialSignupAvailable(result.available));
  }, [checkInitialSignup, navigate]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    if (mode === "signup") {
      const form = new FormData(e.currentTarget as HTMLFormElement);
      try {
        const result = await signup({
          data: {
            fullName: String(form.get("fullName")),
            phone: String(form.get("phone")),
            email,
            password,
            team: String(form.get("team")),
          },
        });
        if (!result.ok) {
          if (result.reason === "email_exists") {
            setMessage("Este e-mail já possui uma conta. Entre com sua senha ou recupere o acesso.");
          } else {
              setMessage(result.reason === "signup_closed" ? "Novos acessos são criados pela gestão da equipe." : "Não foi possível criar a conta. Tente novamente.");
          }
          setBusy(false);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: "/dashboard", replace: true });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível criar a conta.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setMessage(
        error
          ? "Não foi possível enviar o link."
          : "Enviamos o link de recuperação para seu e-mail.",
      );
      setBusy(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage("E-mail ou senha incorretos.");
    else void navigate({ to: "/dashboard", replace: true });
    setBusy(false);
  };
  return (
    <main className="auth-page">
      <ThemeToggle className="auth-theme-toggle" />
      <section className="auth-brand">
        <img src={logo.url} alt="Dábliu Consórcios" />
        <span>CENTRAL DE RESULTADOS</span>
        <h1>Performance comercial em tempo real.</h1>
        <p>Vendas, equipes, relatórios e notificações reunidos em uma operação segura.</p>
        <div className="auth-benefits">
          <span>
            <BarChart3 /> Indicadores ao vivo
          </span>
          <span>
            <BellRing /> Alertas instantâneos
          </span>
          <span>
            <LockKeyhole /> Acesso por hierarquia
          </span>
        </div>
      </section>
      <section className="auth-card">
        <img src={logo.url} alt="Dábliu Consórcios" className="auth-logo" />
        <span className="panel-kicker">ACESSO SEGURO</span>
        <h2>
          {mode === "forgot"
            ? "Recuperar senha"
            : mode === "signup"
              ? "Criar sua conta"
              : "Bem-vindo de volta"}
        </h2>
        <p>
          {mode === "forgot"
            ? "Informe seu e-mail para receber o link."
            : mode === "signup"
              ? "Configure o primeiro acesso de Presidente/Diretor."
              : "Entre com seu e-mail e senha."}
        </p>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label>
                Nome completo
                <input name="fullName" minLength={3} maxLength={120} autoComplete="name" required />
              </label>
              <label>
                Telefone
                <input name="phone" type="tel" minLength={10} maxLength={20} autoComplete="tel" required />
              </label>
            </>
          )}
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
              autoComplete="email"
              required
            />
          </label>
          {mode !== "forgot" && (
            <>
              <label>
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={mode === "signup" ? 10 : 8}
                  maxLength={72}
                  pattern={mode === "signup" ? "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{10,72}" : undefined}
                  title={mode === "signup" ? "Use ao menos 10 caracteres, com maiúscula, minúscula, número e símbolo." : undefined}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                />
              </label>
              {mode === "signup" && (
                <>
                  <label>
                    Equipe
                    <input name="team" minLength={2} maxLength={100} required />
                  </label>
                </>
              )}
            </>
          )}
          {message && <div className="auth-message">{message}</div>}
          <button className="primary-btn auth-submit" disabled={busy}>
            {busy ? (
              "Aguarde..."
            ) : (
              <>
                {mode === "forgot" ? "Enviar link" : mode === "signup" ? "Criar conta" : "Entrar"}
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
        {mode === "login" && (
          <>
            {initialSignupAvailable && <button className="auth-link" onClick={() => setMode("signup")}>Configurar primeiro acesso</button>}
            <button className="auth-link" onClick={() => setMode("forgot")}>
              Esqueci minha senha
            </button>
          </>
        )}
        {mode !== "login" && (
          <button
            className="auth-link"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
          >
            Voltar para entrar
          </button>
        )}
      </section>
    </main>
  );
}
