import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, BellRing, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requestAccess } from "@/lib/auth.functions";
import { ThemeToggle } from "@/components/theme-toggle";
import logo from "@/assets/dabliu-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Entrar | Dábliu Consórcios" }, { name: "description", content: "Acesso seguro à Central de Resultados Dábliu Consórcios." }, { property: "og:title", content: "Central de Resultados | Dábliu Consórcios" }, { property: "og:description", content: "Acesso seguro à operação comercial Dábliu." }, { property: "og:type", content: "website" }, { property: "og:image", content: "https://comercialdabliuconsorcios.lovable.app/__l5e/assets-v1/10f4a8ff-d9be-4747-8a78-befda610e55e/dabliu-share.png" }, { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:image", content: "https://comercialdabliuconsorcios.lovable.app/__l5e/assets-v1/10f4a8ff-d9be-4747-8a78-befda610e55e/dabliu-share.png" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate(); const submitAccessRequest = useServerFn(requestAccess);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => { if (data.user) void navigate({ to: "/dashboard", replace: true }); }); }, [navigate]);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setMessage("");
    if (mode === "forgot") { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); setMessage(error ? "Não foi possível enviar o link." : "Enviamos o link de recuperação para seu e-mail."); setBusy(false); return; }
    if (mode === "signup") { try { await submitAccessRequest({ data: { fullName: name, email, password } }); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; void navigate({ to: "/dashboard", replace: true }); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível solicitar o acesso."); } setBusy(false); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setMessage("E-mail ou senha incorretos."); else void navigate({ to: "/dashboard", replace: true }); setBusy(false);
  };
  return <main className="auth-page"><ThemeToggle className="auth-theme-toggle" /><section className="auth-brand"><img src={logo.url} alt="Dábliu Consórcios" /><span>CENTRAL DE RESULTADOS</span><h1>Performance comercial em tempo real.</h1><p>Vendas, metas, equipes e notificações reunidas em uma operação segura.</p><div className="auth-benefits"><span><BarChart3 /> Indicadores ao vivo</span><span><BellRing /> Alertas instantâneos</span><span><LockKeyhole /> Acesso por hierarquia</span></div></section><section className="auth-card"><img src={logo.url} alt="Dábliu Consórcios" className="auth-logo" /><span className="panel-kicker">ACESSO SEGURO</span><h2>{mode === "forgot" ? "Recuperar senha" : mode === "signup" ? "Solicitar acesso" : "Bem-vindo de volta"}</h2><p>{mode === "signup" ? "Cadastre-se sem confirmação por e-mail. O Director aprovará seu acesso." : mode === "forgot" ? "Informe seu e-mail para receber o link." : "Entre para acessar sua área de resultados."}</p><form onSubmit={submit}>{mode === "signup" && <label>Nome completo<input value={name} onChange={(e) => setName(e.target.value)} minLength={3} required /></label>}<label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>{mode !== "forgot" && <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></label>}{message && <div className="auth-message">{message}</div>}<button className="primary-btn auth-submit" disabled={busy}>{busy ? "Aguarde..." : <>{mode === "forgot" ? "Enviar link" : mode === "signup" ? "Enviar para aprovação" : "Entrar"}<ArrowRight size={17} /></>}</button></form>{mode === "login" && <button className="auth-link" onClick={() => setMode("forgot")}>Esqueci minha senha</button>}{mode === "login" && <button className="auth-link" onClick={() => setMode("signup")}>Solicitar acesso</button>}{mode !== "login" && <button className="auth-link" onClick={() => { setMode("login"); setMessage(""); }}>Voltar para entrar</button>}</section></main>;
}
