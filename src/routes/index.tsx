import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, BellRing, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSetupStatus } from "@/lib/auth.functions";
import logo from "@/assets/dabliu-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Entrar | Dábliu Consórcios" }, { name: "description", content: "Acesso seguro à Central de Resultados Dábliu Consórcios." }, { property: "og:title", content: "Central de Resultados | Dábliu Consórcios" }, { property: "og:description", content: "Acesso seguro à operação comercial Dábliu." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate(); const setupStatus = useServerFn(getSetupStatus);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login"); const [needsSetup, setNeedsSetup] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { void Promise.all([supabase.auth.getUser(), setupStatus()]).then(([auth, setup]) => { setNeedsSetup(setup.needsSetup); if (auth.data.user) void navigate({ to: "/dashboard", replace: true }); }); }, [navigate, setupStatus]);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setMessage("");
    if (mode === "forgot") { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); setMessage(error ? "Não foi possível enviar o link." : "Enviamos o link de recuperação para seu e-mail."); setBusy(false); return; }
    if (mode === "signup") { const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: name } } }); if (error) setMessage(error.message); else if (!data.session) setMessage("Confirme seu e-mail e depois entre para concluir a configuração."); else void navigate({ to: "/dashboard" }); setBusy(false); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setMessage("E-mail ou senha incorretos."); else void navigate({ to: "/dashboard", replace: true }); setBusy(false);
  };
  return <main className="auth-page"><section className="auth-brand"><img src={logo.url} alt="Dábliu Consórcios" /><span>CENTRAL DE RESULTADOS</span><h1>Performance comercial em tempo real.</h1><p>Vendas, metas, equipes e notificações reunidas em uma operação segura.</p><div className="auth-benefits"><span><BarChart3 /> Indicadores ao vivo</span><span><BellRing /> Alertas instantâneos</span><span><LockKeyhole /> Acesso por hierarquia</span></div></section><section className="auth-card"><img src={logo.url} alt="Dábliu Consórcios" className="auth-logo" /><span className="panel-kicker">ACESSO SEGURO</span><h2>{mode === "forgot" ? "Recuperar senha" : mode === "signup" ? "Configuração inicial" : "Bem-vindo de volta"}</h2><p>{mode === "signup" ? "Crie a primeira conta Director da operação." : mode === "forgot" ? "Informe seu e-mail para receber o link." : "Entre para acessar sua área de resultados."}</p><form onSubmit={submit}>{mode === "signup" && <label>Nome completo<input value={name} onChange={(e) => setName(e.target.value)} minLength={3} required /></label>}<label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>{mode !== "forgot" && <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></label>}{message && <div className="auth-message">{message}</div>}<button className="primary-btn auth-submit" disabled={busy}>{busy ? "Aguarde..." : <>{mode === "forgot" ? "Enviar link" : mode === "signup" ? "Criar acesso Director" : "Entrar"}<ArrowRight size={17} /></>}</button></form>{mode === "login" && <button className="auth-link" onClick={() => setMode("forgot")}>Esqueci minha senha</button>}{mode === "login" && needsSetup && <button className="auth-link" onClick={() => setMode("signup")}>Configurar primeiro Director</button>}{mode !== "login" && <button className="auth-link" onClick={() => { setMode("login"); setMessage(""); }}>Voltar para entrar</button>}</section></main>;
}
