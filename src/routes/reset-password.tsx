import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/dabliu-logo.png.asset.json";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir senha | Dábliu Consórcios" }, { name: "description", content: "Crie uma nova senha para acessar a Central Dábliu." }, { property: "og:title", content: "Redefinir senha | Dábliu Consórcios" }, { property: "og:description", content: "Crie uma nova senha para acessar a Central Dábliu." }, { property: "og:type", content: "website" }, { property: "og:image", content: "https://comercialdabliuconsorcios.lovable.app/__l5e/assets-v1/10f4a8ff-d9be-4747-8a78-befda610e55e/dabliu-share.png" }, { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:image", content: "https://comercialdabliuconsorcios.lovable.app/__l5e/assets-v1/10f4a8ff-d9be-4747-8a78-befda610e55e/dabliu-share.png" }] }),
  component: ResetPassword,
});
function ResetPassword() {
  const navigate = useNavigate(); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (password.length < 8 || password !== confirm) { setMessage("Use pelo menos 8 caracteres e confirme a mesma senha."); return; } setBusy(true); const { error } = await supabase.auth.updateUser({ password }); setBusy(false); if (error) setMessage("O link expirou. Solicite uma nova recuperação."); else void navigate({ to: "/", replace: true }); };
  return <main className="auth-page"><section className="auth-card"><img src={logo.url} alt="Dábliu Consórcios" className="auth-logo" /><div className="auth-icon"><KeyRound /></div><h1>Crie sua nova senha</h1><p>Escolha uma senha segura para voltar à Central de Resultados.</p><form onSubmit={submit}><label>Nova senha<input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label><label>Confirmar senha<input type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>{message && <div className="auth-message">{message}</div>}<button className="primary-btn auth-submit" disabled={busy}>{busy ? "Salvando..." : "Salvar nova senha"}</button></form><Link to="/">Voltar para entrar</Link></section></main>;
}
