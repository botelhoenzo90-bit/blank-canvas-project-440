import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  Filter,
  LayoutDashboard,
  Menu,
  MonitorPlay,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Target,
  Trophy,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createSaleAndNotify, registerPushDevice } from "@/lib/sales.functions";
import { enablePushNotifications } from "@/lib/push";
import { claimFirstDirector, getMyAccess } from "@/lib/auth.functions";
import { PeoplePanel } from "@/components/people-panel";
import logo from "@/assets/dabliu-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dábliu | Central de Resultados Comerciais" },
      { name: "description", content: "Painel de gestão comercial com vendas, metas, rankings, equipes e relatórios." },
      { property: "og:title", content: "Dábliu | Central de Resultados Comerciais" },
      { property: "og:description", content: "Painel de gestão comercial com vendas, metas, rankings, equipes e relatórios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DabliuApp,
});

type Role = "Director" | "Master" | "Representative" | "Supervisor" | "Seller";
type View = "dashboard" | "sales" | "ranking" | "goals" | "team" | "reports" | "tv";

type Sale = {
  id: string;
  seller: string;
  supervisor: string;
  representative: string;
  master: string;
  team: string;
  value: number;
  date: string;
  time: string;
  status: "Confirmada" | "Pendente";
};

const seedSales: Sale[] = [];

const sellers = ["Ana Martins", "Bruno Rocha", "Camila Souza", "Diego Santos", "Fernanda Lima", "Gabriel Melo", "Helena Dias", "Igor Reis"];
const supervisors = ["Carlos Lima", "Juliana Alves"];
const representatives = ["Marina Costa", "Pedro Mendes"];
const masters = ["Rafael Alves"];

const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const initials = (name: string) => name.split(" ").map((x) => x[0]).slice(0, 2).join("");
type SaleRow = import("@/integrations/supabase/types").Database["public"]["Tables"]["sales"]["Row"];
const saleFromRow = (row: SaleRow): Sale => ({ id: row.id, seller: row.seller, supervisor: row.supervisor, representative: row.representative, master: row.master, team: row.team, value: Number(row.value), date: row.sale_date, time: row.sale_time.slice(0, 5), status: row.status === "Pendente" ? "Pendente" : "Confirmada" });

function DabliuApp() {
  const navigateTo = useNavigate();
  const [view, setView] = useState<View>("dashboard");
  const [role, setRole] = useState<Role | null>(null);
  const [profileName, setProfileName] = useState("");
  const [accessLoading, setAccessLoading] = useState(true); const [accessPending, setAccessPending] = useState(false);
  const [sales, setSales] = useState<Sale[]>(seedSales);
  const [period, setPeriod] = useState("Hoje");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [tvMode, setTvMode] = useState(false);
  const [tvAnnouncement, setTvAnnouncement] = useState<Sale | null>(null);
  const [savingSale, setSavingSale] = useState(false);
  const createSale = useServerFn(createSaleAndNotify);
  const savePushDevice = useServerFn(registerPushDevice);
  const loadAccess = useServerFn(getMyAccess);
  const finishSetup = useServerFn(claimFirstDirector);

  const refreshAccess = async () => { const access = await loadAccess(); setRole(access.role ? ({ director: "Director", master: "Master", representative: "Representative", supervisor: "Supervisor", seller: "Seller" } as const)[access.role] : null); setProfileName(access.profile?.full_name ?? ""); setAccessPending(access.pending); setAccessLoading(false); };
  useEffect(() => { void refreshAccess().catch(() => setAccessLoading(false)); }, []);

  useEffect(() => {
    let active = true;
    void supabase.from("sales").select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        toast.error("Não foi possível carregar as vendas");
        return;
      }
      setSales((data ?? []).map(saleFromRow));
    });
    const channel = supabase.channel("dabliu-live-sales").on("postgres_changes", { event: "INSERT", schema: "public", table: "sales" }, (payload) => {
      const newSale = saleFromRow(payload.new as SaleRow);
      setSales((current) => [newSale, ...current.filter((sale) => sale.id !== newSale.id)]);
      setTvAnnouncement(newSale);
      toast.success("Nova venda registrada", { description: `${newSale.seller} • ${money(newSale.value)}` });
    }).subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const todaySales = sales.filter((s) => s.date === today);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.value, 0);
  const monthTotal = sales.reduce((sum, s) => sum + s.value, 0);
  const avgTicket = sales.length ? monthTotal / sales.length : 0;
  const goal = 240000;
  const goalPct = Math.min(100, Math.round((monthTotal / goal) * 100));

  const registerSale = async (sale: Omit<Sale, "id" | "date" | "time">) => {
    setSavingSale(true);
    try {
      await createSale({ data: sale });
      setShowSaleModal(false);
      toast.success("Venda confirmada", { description: "A Central TV foi atualizada." });
    } catch {
      toast.error("Não foi possível registrar a venda", { description: "Confira sua conexão e tente novamente." });
    } finally {
      setSavingSale(false);
    }
  };

  const activateNotifications = async () => {
    const result = await enablePushNotifications();
    if (result.status === "registered") {
      await savePushDevice({ data: { token: result.token, deviceLabel: navigator.userAgent.slice(0, 160) } });
      toast.success("Notificações ativadas neste aparelho");
    } else if (result.status === "install-on-iphone") toast.info("Instale o Dábliu no iPhone", { description: "No Safari, toque em Compartilhar → Adicionar à Tela de Início. Abra pelo novo ícone e tente novamente." });
    else if (result.status === "open-in-new-tab") toast.info("Abra o sistema em uma nova aba", { description: "As notificações não podem ser ativadas dentro da prévia do Lovable." });
    else if (result.status === "not-configured") toast.error("Web Push ainda não está configurado", { description: "Atualize a conexão Firebase e marque Include web push." });
    else if (result.status === "denied") toast.error("Notificações bloqueadas", { description: "Permita notificações nos ajustes deste site." });
    else toast.error("Este aparelho não aceita notificações pelo navegador");
  };

  const navigate = (next: View) => { setView(next); setSidebarOpen(false); };
  const signOut = async () => { await supabase.auth.signOut(); void navigateTo({ to: "/", replace: true }); };

  if (accessLoading) return <div className="auth-page"><div className="auth-card"><img src={logo.url} alt="Dábliu Consórcios" className="auth-logo" /><p>Carregando seu acesso...</p></div></div>;
  if (accessPending) return <PendingAccess name={profileName} onExit={signOut} />;
  if (!role) return <InitialSetup name={profileName} onSetup={async (fullName) => { await finishSetup({ data: { fullName } }); await refreshAccess(); }} />;

  if (tvMode || view === "tv") {
    return <TvPanel sales={sales} announcement={tvAnnouncement} onExit={() => { setTvMode(false); setView("dashboard"); }} />;
  }

  return (
    <div className="dab-app">
      <aside className={`dab-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="dab-brand"><img src={logo.url} alt="Dábliu Consórcios" /><div><strong>Dábliu</strong><span>Central de Resultados</span></div></div>
        <div className="dab-workspace"><span>OPERAÇÃO</span><button><span className="live-dot" /> Operação Principal <ChevronDown size={15} /></button></div>
        <nav>
          <NavItem icon={<LayoutDashboard size={18} />} label="Visão geral" active={view === "dashboard"} onClick={() => navigate("dashboard")} />
          <NavItem icon={<CircleDollarSign size={18} />} label="Vendas" active={view === "sales"} onClick={() => navigate("sales")} />
          <NavItem icon={<Trophy size={18} />} label="Ranking" active={view === "ranking"} onClick={() => navigate("ranking")} />
          <NavItem icon={<Target size={18} />} label="Metas" active={view === "goals"} onClick={() => navigate("goals")} />
          <NavItem icon={<Users size={18} />} label="Equipe" active={view === "team"} onClick={() => navigate("team")} />
          <NavItem icon={<Activity size={18} />} label="Relatórios" active={view === "reports"} onClick={() => navigate("reports")} />
          <div className="nav-divider" />
          <NavItem icon={<MonitorPlay size={18} />} label="Central TV" active={false} onClick={() => { setView("tv"); }} />
          {role === "Director" && <NavItem icon={<ShieldCheck size={18} />} label="Permissões" active={view === "team"} onClick={() => navigate("team")} />}
          <NavItem icon={<Settings size={18} />} label="Sair" active={false} onClick={() => void signOut()} />
        </nav>
        <div className="sidebar-bottom"><div className="mini-profile"><div className="avatar">{initials(profileName || "Usuário")}</div><div><strong>{profileName || "Usuário"}</strong><span>{role}</span></div><MoreHorizontal size={18} /></div></div>
      </aside>

      <main className="dab-main">
        <header className="dab-header">
          <button className="mobile-menu" onClick={() => setSidebarOpen((v) => !v)}><Menu size={22} /></button>
          <div><div className="breadcrumb">Dábliu <span>/</span> {view === "dashboard" ? "Visão geral" : view}</div><h1>{view === "dashboard" ? `Olá, ${profileName.split(" ")[0] || "Usuário"}` : titleFor(view)}</h1></div>
          <div className="header-actions">
             <div className="role-select"><ShieldCheck size={15} /><strong>{role}</strong></div>
             <button className="icon-btn" aria-label="Notificações" onClick={() => setShowNotifications((v) => !v)}><Bell size={19} /></button>
             <button className="avatar header-avatar" onClick={() => void signOut()} title="Sair">{initials(profileName || "Usuário")}</button>
          </div>
           {showNotifications && <div className="notifications"><div className="notif-head"><strong>Notificações no celular</strong><button onClick={() => setShowNotifications(false)}><X size={16} /></button></div><div className="push-panel"><Bell size={20} /><p>Receba uma notificação sempre que uma venda for confirmada.</p><button className="primary-btn" onClick={() => void activateNotifications()}>Ativar notificações</button><small>No iPhone, adicione o Dábliu à Tela de Início primeiro.</small></div></div>}
        </header>

        <div className="content">
          <div className="top-toolbar"><div className="periods">{["Hoje", "7 dias", "30 dias", "Personalizado"].map((p) => <button className={period === p ? "active" : ""} key={p} onClick={() => setPeriod(p)}>{p === "Personalizado" && <CalendarDays size={14} />}{p}</button>)}</div><div className="toolbar-right"><button className="outline-btn" onClick={() => setTvMode(true)}><MonitorPlay size={16} /> Abrir TV</button><button className="primary-btn" onClick={() => setShowSaleModal(true)}><Plus size={17} /> Registrar venda</button></div></div>

          {view === "dashboard" && <Dashboard sales={sales} todayTotal={todayTotal} monthTotal={monthTotal} avgTicket={avgTicket} goalPct={goalPct} />}
          {view === "sales" && <SalesView sales={sales} search={search} setSearch={setSearch} onAdd={() => setShowSaleModal(true)} />}
          {view === "ranking" && <RankingView sales={sales} />}
          {view === "goals" && <GoalsView total={monthTotal} />}
          {view === "team" && <PeoplePanel role={role.toLowerCase() as "director" | "master" | "representative" | "supervisor" | "seller"} />}
          {view === "reports" && <ReportsView sales={sales} />}
        </div>
      </main>

       {showSaleModal && <SaleModal onClose={() => setShowSaleModal(false)} onSave={registerSale} saving={savingSale} />}
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) { return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>; }
function InitialSetup({ name, onSetup }: { name: string; onSetup: (name: string) => Promise<void> }) { const [fullName, setFullName] = useState(name); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); try { await onSetup(fullName); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir a configuração."); } finally { setBusy(false); } }; return <main className="auth-page"><section className="auth-card"><img src={logo.url} alt="Dábliu Consórcios" className="auth-logo" /><span className="panel-kicker">PRIMEIRO ACESSO</span><h1>Concluir configuração</h1><p>Esta será a conta Director responsável por administrar toda a operação.</p><form onSubmit={submit}><label>Nome completo<input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={3} /></label>{message && <div className="auth-message">{message}</div>}<button className="primary-btn auth-submit" disabled={busy}>{busy ? "Configurando..." : "Concluir como Director"}</button></form></section></main>; }
function PendingAccess({ name, onExit }: { name: string; onExit: () => Promise<void> }) { return <main className="auth-page"><section className="auth-card pending-card"><img src={logo.url} alt="Dábliu Consórcios" className="auth-logo" /><div className="auth-icon"><ShieldCheck /></div><span className="panel-kicker">SOLICITAÇÃO RECEBIDA</span><h1>Aguardando aprovação</h1><p>{name ? `${name}, seu cadastro foi recebido.` : "Seu cadastro foi recebido."} O Director precisa definir seu perfil, equipe e superior antes da liberação.</p><div className="auth-message">Não é necessário confirmar o e-mail. Entre novamente após receber a aprovação do Director.</div><button className="outline-btn auth-submit" onClick={() => void onExit()}>Sair</button></section></main>; }
function Notification({ text, time }: { text: string; time: string }) { return <div className="notification"><div className="notif-icon"><Zap size={14} /></div><div><p>{text}</p><small>{time}</small></div></div>; }
function titleFor(v: View) { return ({ sales: "Vendas", ranking: "Ranking de performance", goals: "Metas e objetivos", team: "Gestão da equipe", reports: "Relatórios" } as Record<string, string>)[v] || "Central de Resultados"; }

function Dashboard({ sales, todayTotal, monthTotal, avgTicket, goalPct }: { sales: Sale[]; todayTotal: number; monthTotal: number; avgTicket: number; goalPct: number }) {
  const max = Math.max(...[120, 180, 145, 210, 190, 240, 225], 1);
  const points = [120, 180, 145, 210, 190, 240, 225];
  return <>
    <section className="welcome-strip"><div><span className="eyebrow"><span className="live-dot" /> AO VIVO</span><h2>Central de Resultados</h2><p>Acompanhe a operação comercial em tempo real.</p></div><div className="live-stat"><span>Última atualização</span><strong>agora mesmo</strong></div></section>
    <section className="metric-grid">
      <Metric icon={<CircleDollarSign />} label="Vendas hoje" value={money(todayTotal)} delta="18,4%" positive sub="vs. ontem" />
      <Metric icon={<CalendarDays />} label="Vendas no mês" value={money(monthTotal)} delta="12,8%" positive sub="vs. mês anterior" />
      <Metric icon={<Activity />} label="Ticket médio" value={money(avgTicket)} delta="6,2%" positive sub="vs. período anterior" />
      <Metric icon={<Target />} label="Meta atingida" value={`${goalPct}%`} delta="24,0%" positive sub="meta mensal" progress={goalPct} />
    </section>
    <section className="dashboard-grid">
      <div className="panel chart-panel"><div className="panel-head"><div><span className="panel-kicker">PERFORMANCE</span><h3>Evolução das vendas</h3></div><button className="ghost-btn">30 dias <ChevronDown size={14} /></button></div><div className="chart"><div className="y-axis"><span>250k</span><span>200k</span><span>150k</span><span>100k</span><span>50k</span><span>0</span></div><div className="chart-area"><div className="grid-lines" /> <svg viewBox="0 0 700 240" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="rgba(255,159,67,.30)" /><stop offset="100%" stopColor="rgba(255,159,67,0)" /></linearGradient></defs><path d="M0,205 C55,180 75,185 115,145 S180,155 225,110 S290,145 340,95 S405,115 450,70 S510,100 555,52 S625,65 700,30 L700,240 L0,240 Z" fill="url(#fill)"/><path d="M0,205 C55,180 75,185 115,145 S180,155 225,110 S290,145 340,95 S405,115 450,70 S510,100 555,52 S625,65 700,30" fill="none" stroke="var(--accent)" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg><div className="x-axis">{["01 Set", "05 Set", "10 Set", "15 Set", "17 Set"].map((x) => <span key={x}>{x}</span>)}</div></div></div></div>
      <div className="panel goal-panel"><div className="panel-head"><div><span className="panel-kicker">OBJETIVO</span><h3>Meta mensal</h3></div><Target size={19} /></div><div className="goal-ring" style={{ "--pct": `${goalPct * 3.6}deg` } as React.CSSProperties}><div><strong>{goalPct}%</strong><span>atingido</span></div></div><div className="goal-numbers"><div><span>Realizado</span><strong>{money(monthTotal)}</strong></div><div><span>Meta</span><strong>{money(240000)}</strong></div><div><span>Faltam</span><strong>{money(Math.max(0, 240000 - monthTotal))}</strong></div></div></div>
    </section>
    <section className="dashboard-grid lower"><div className="panel ranking-panel"><div className="panel-head"><div><span className="panel-kicker">DESEMPENHO</span><h3>Ranking de vendedores</h3></div><button className="text-btn">Ver ranking <ArrowUpRight size={14} /></button></div><div className="rank-list">{sellerRanking(sales).slice(0, 5).map((s, i) => <div className="rank-row" key={s.name}><span className={`rank-pos pos-${i + 1}`}>{i + 1}</span><div className="avatar small">{initials(s.name)}</div><div className="rank-name"><strong>{s.name}</strong><span>{s.sales} vendas</span></div><div className="rank-value">{money(s.value)}</div><div className="trend"><ArrowUpRight size={14} />{["24%", "18%", "14%", "9%", "6%"][i]}</div></div>)}</div></div><div className="panel feed-panel"><div className="panel-head"><div><span className="panel-kicker">TEMPO REAL</span><h3>Últimas vendas</h3></div><span className="live-badge"><span className="live-dot" /> LIVE</span></div><div className="sales-feed">{sales.slice(0, 5).map((s) => <div className="feed-row" key={s.id}><div className="feed-avatar">{initials(s.seller)}</div><div><strong>{s.seller}</strong><span>{s.team} • {s.time}</span></div><strong className="feed-value">+{money(s.value)}</strong></div>)}</div></div></section>
    <section className="panel team-performance"><div className="panel-head"><div><span className="panel-kicker">ESTRUTURA</span><h3>Resultados por equipe</h3></div><button className="ghost-btn">Este mês <ChevronDown size={14} /></button></div><div className="team-bars">{[{ name: "Time Alpha", progress: 86, value: 108400 }, { name: "Time Beta", progress: 71, value: 89400 }, { name: "Time Gamma", progress: 48, value: 42300 }].map((team) => <div className="team-bar" key={team.name}><div><strong>{team.name}</strong><span>{money(team.value)}</span></div><div className="bar"><i style={{ width: `${team.progress}%` }} /></div><small>{team.progress}% da meta</small></div>)}</div></section>
  </>;
}

function Metric({ icon, label, value, delta, positive, sub, progress }: { icon: React.ReactNode; label: string; value: string; delta: string; positive: boolean; sub: string; progress?: number }) { return <div className="metric"><div className="metric-top"><div className="metric-icon">{icon}</div><span className={`delta ${positive ? "up" : "down"}`}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{delta}</span></div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong>{progress !== undefined ? <div className="mini-progress"><i style={{ width: `${progress}%` }} /></div> : null}<span className="metric-sub">{sub}</span></div>; }

function sellerRanking(sales: Sale[]) { const map = new Map<string, { name: string; value: number; sales: number }>(); sales.forEach((s) => { const old = map.get(s.seller) || { name: s.seller, value: 0, sales: 0 }; old.value += s.value; old.sales += 1; map.set(s.seller, old); }); return [...map.values()].sort((a, b) => b.value - a.value); }

function SalesView({ sales, search, setSearch, onAdd }: { sales: Sale[]; search: string; setSearch: (v: string) => void; onAdd: () => void }) { const filtered = sales.filter((s) => [s.seller, s.supervisor, s.team].join(" ").toLowerCase().includes(search.toLowerCase())); return <section className="panel full-panel"><div className="panel-head"><div><span className="panel-kicker">OPERAÇÃO COMERCIAL</span><h3>Histórico de vendas</h3></div><button className="primary-btn" onClick={onAdd}><Plus size={16} /> Nova venda</button></div><div className="filters"><div className="search"><Search size={17} /><input placeholder="Buscar vendedor, equipe..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><button className="filter-btn"><Filter size={15} /> Filtros <span>3</span></button><button className="filter-btn">Status <ChevronDown size={14} /></button><button className="filter-btn">Período <ChevronDown size={14} /></button></div><DataTable sales={filtered} /></section>; }

function DataTable({ sales }: { sales: Sale[] }) { return <div className="table-wrap"><table><thead><tr><th>VENDEDOR</th><th>SUPERVISOR</th><th>EQUIPE</th><th>DATA / HORA</th><th>VALOR</th><th>STATUS</th><th /></tr></thead><tbody>{sales.map((s) => <tr key={s.id}><td><div className="person-cell"><div className="avatar small">{initials(s.seller)}</div><strong>{s.seller}</strong></div></td><td>{s.supervisor}</td><td><span className="team-pill">{s.team}</span></td><td>{new Date(`${s.date}T${s.time}`).toLocaleDateString("pt-BR")} <small>{s.time}</small></td><td className="table-value">{money(s.value)}</td><td><span className={`status ${s.status === "Confirmada" ? "confirmed" : "pending"}`}><i />{s.status}</span></td><td><button className="row-more"><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></div>; }

function RankingView({ sales }: { sales: Sale[] }) { const [type, setType] = useState("Vendedores"); const data = type === "Vendedores" ? sellerRanking(sales) : type === "Supervisores" ? hierarchyRanking(sales, "supervisor") : type === "Representantes" ? hierarchyRanking(sales, "representative") : hierarchyRanking(sales, "master"); const topValue = data[0]?.value ?? 1; return <section className="panel full-panel"><div className="ranking-hero"><div><span className="panel-kicker">PERFORMANCE</span><h3>Quem está entregando resultado</h3><p>Ranking atualizado automaticamente a cada nova venda.</p></div><Trophy size={42} /></div><div className="rank-tabs">{["Vendedores", "Supervisores", "Representantes", "Masters"].map((x) => <button className={type === x ? "active" : ""} key={x} onClick={() => setType(x)}>{x}</button>)}</div><div className="leaderboard">{data.map((item, i) => <div className="leader-row" key={item.name}><div className={`leader-place place-${i + 1}`}>{i + 1}</div><div className="avatar">{initials(item.name)}</div><div className="leader-person"><strong>{item.name}</strong><span>{"sales" in item ? `${item.sales} vendas` : "Estrutura comercial"}</span></div><div className="leader-bar"><i style={{ width: `${Math.max(12, (item.value / topValue) * 100)}%` }} /></div><strong className="leader-money">{money(item.value)}</strong><span className="trend"><ArrowUpRight size={14} /> {i === 0 ? "24,8%" : `${18 - i * 3},2%`}</span></div>)}</div></section>; }
function hierarchyRanking(sales: Sale[], key: keyof Sale) { const map = new Map<string, { name: string; value: number }>(); sales.forEach((s) => { const name = String(s[key]); const old = map.get(name) || { name, value: 0 }; old.value += s.value; map.set(name, old); }); return [...map.values()].sort((a, b) => b.value - a.value); }

function GoalsView({ total }: { total: number }) { const goals = [{ name: "Meta geral da operação", target: 240000, value: total }, { name: "Time Alpha", target: 125000, value: 108400 }, { name: "Time Beta", target: 110000, value: 89400 }, { name: "Vendedores", target: 240000, value: total }]; return <section className="goal-grid">{goals.map((g) => { const p = Math.min(100, Math.round((g.value / g.target) * 100)); return <div className="panel goal-card" key={g.name}><div className="goal-card-head"><div className="metric-icon"><Target size={18} /></div><button><MoreHorizontal size={17} /></button></div><span>{g.name}</span><strong>{money(g.value)}</strong><div className="bar large"><i style={{ width: `${p}%` }} /></div><div className="goal-foot"><span>{p}% atingido</span><b>Meta {money(g.target)}</b></div><p>{p >= 100 ? "Meta alcançada! Excelente resultado." : `Faltam ${money(g.target - g.value)} para alcançar.`}</p></div>; })}<div className="panel create-goal"><div className="create-icon"><Plus size={24} /></div><h3>Criar nova meta</h3><p>Defina objetivos individuais ou por equipe e acompanhe a evolução.</p><button className="primary-btn" onClick={() => toast.success("Meta preparada", { description: "A configuração será aberta na próxima etapa." })}>Configurar meta</button></div></section>; }

function TeamView({ sales, role }: { sales: Sale[]; role: Role }) { const people = sellers.map((name) => ({ name, supervisor: sales.find((s) => s.seller === name)?.supervisor || "Carlos Lima", value: sales.filter((s) => s.seller === name).reduce((a, b) => a + b.value, 0) })); return <section className="panel full-panel"><div className="panel-head"><div><span className="panel-kicker">HIERARQUIA</span><h3>Equipe e acessos</h3><p className="subhead">Visão permitida para <strong>{role}</strong> • Director tem acesso total.</p></div><button className="primary-btn" onClick={() => toast.success("Novo usuário", { description: "Formulário de criação preparado." })}><UserPlus size={16} /> Adicionar usuário</button></div><div className="role-cards">{([["Director", "Acesso total", "Tudo"], ["Master", "Gestão", "Representatives + estrutura"], ["Representative", "Operação", "Supervisores + sellers"], ["Supervisor", "Equipe", "Sellers"], ["Seller", "Individual", "Próprios resultados"]] as string[][]).map((r) => <div className="role-card" key={r[0]}><ShieldCheck size={18} /><strong>{r[0]}</strong><span>{r[1]}</span><small>{r[2]}</small></div>)}</div><DataTeam people={people} /></section>; }
function DataTeam({ people }: { people: { name: string; supervisor: string; value: number }[] }) { return <div className="table-wrap"><table><thead><tr><th>COLABORADOR</th><th>PERFIL</th><th>SUPERVISOR</th><th>RESULTADO</th><th>META</th><th>ACESSO</th></tr></thead><tbody>{people.map((p, i) => <tr key={p.name}><td><div className="person-cell"><div className="avatar small">{initials(p.name)}</div><strong>{p.name}</strong></div></td><td>Seller</td><td>{p.supervisor}</td><td className="table-value">{money(p.value)}</td><td><span className="goal-tag">{Math.min(100, Math.round((p.value / 30000) * 100))}%</span></td><td><span className="access-tag"><Check size={13} /> Ativo</span></td></tr>)}</tbody></table></div>; }

function ReportsView({ sales }: { sales: Sale[] }) { const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [status, setStatus] = useState("Todos"); const filtered = sales.filter((s) => (!start || s.date >= start) && (!end || s.date <= end) && (status === "Todos" || s.status === status)); const total = filtered.reduce((a, b) => a + b.value, 0); const exportCsv = () => { const csv = ["Vendedor;Supervisor;Representante;Master;Equipe;Data;Hora;Valor;Status", ...filtered.map((s) => `${s.seller};${s.supervisor};${s.representative};${s.master};${s.team};${s.date};${s.time};${s.value};${s.status}`)].join("\n"); const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "dabliu-relatorio.csv"; a.click(); URL.revokeObjectURL(a.href); toast.success("Relatório exportado", { description: "Arquivo compatível com Excel." }); }; return <section className="report-grid"><div className="panel full-panel print-report"><div className="print-heading"><img src={logo.url} alt="Dábliu Consórcios" /><div><h2>Relatório de performance comercial</h2><span>Emitido em {new Date().toLocaleDateString("pt-BR")}</span></div></div><div className="panel-head"><div><span className="panel-kicker">RELATÓRIOS</span><h3>Performance comercial</h3></div><div className="export-actions"><button className="outline-btn" onClick={exportCsv}><FileSpreadsheet size={16} /> Planilha</button><button className="outline-btn" onClick={() => window.print()}><Download size={16} /> Salvar PDF</button></div></div><div className="report-filters"><div><label>Data inicial</label><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div><div><label>Data final</label><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div><div><label>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)}><option>Todos</option><option>Confirmada</option><option>Pendente</option></select></div></div><div className="report-summary"><div><span>Total vendido</span><strong>{money(total)}</strong></div><div><span>Vendas</span><strong>{filtered.length}</strong></div><div><span>Ticket médio</span><strong>{money(filtered.length ? total / filtered.length : 0)}</strong></div><div><span>Confirmadas</span><strong>{filtered.filter((s) => s.status === "Confirmada").length}</strong></div></div><DataTable sales={filtered} /></div></section>; }

function SaleModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (s: Omit<Sale, "id" | "date" | "time">) => Promise<void>; saving: boolean }) { const [seller, setSeller] = useState(sellers[0] ?? ""); const [supervisor, setSupervisor] = useState(supervisors[0] ?? ""); const [value, setValue] = useState(10000); const [team, setTeam] = useState("Time Alpha"); const submit = (e: React.FormEvent) => { e.preventDefault(); void onSave({ seller, supervisor, representative: representatives[0] ?? "", master: masters[0] ?? "", team, value: Number(value), status: "Confirmada" }); }; return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="sale-modal" onSubmit={submit}><div className="modal-head"><div><span className="panel-kicker">NOVA OPERAÇÃO</span><h3>Registrar venda</h3><p>A venda aparecerá automaticamente na Central TV.</p></div><button type="button" onClick={onClose}><X size={19} /></button></div><div className="form-grid"><label>Vendedor<select value={seller} onChange={(e) => setSeller(e.target.value)}>{sellers.map((x) => <option key={x}>{x}</option>)}</select></label><label>Supervisor<select value={supervisor} onChange={(e) => setSupervisor(e.target.value)}>{supervisors.map((x) => <option key={x}>{x}</option>)}</select></label><label>Equipe<select value={team} onChange={(e) => setTeam(e.target.value)}><option>Time Alpha</option><option>Time Beta</option><option>Time Gamma</option></select></label><label>Valor da venda<input type="number" min="1" value={value} onChange={(e) => setValue(Number(e.target.value))} /></label></div><div className="modal-note"><Zap size={17} /><span><strong>Tempo real ativado.</strong> Esta operação sincroniza com celular, computador e TV.</span></div><div className="modal-actions"><button type="button" className="outline-btn" onClick={onClose} disabled={saving}>Cancelar</button><button className="primary-btn" disabled={saving}><Check size={16} /> {saving ? "Confirmando..." : "Confirmar venda"}</button></div></form></div>; }

function TvPanel({ sales, announcement, onExit }: { sales: Sale[]; announcement: Sale | null; onExit: () => void }) {
  const [clock, setClock] = useState(new Date());
  const [featuredSale, setFeaturedSale] = useState<Sale | null>(null);
  useEffect(() => { const id = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (!announcement) return;
    setFeaturedSale(announcement);
    const id = window.setTimeout(() => setFeaturedSale(null), 15000);
    return () => window.clearTimeout(id);
  }, [announcement]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const todaySales = sales.filter((s) => s.date === today);
  return <div className="tv-screen">
    <div className="tv-top"><div className="tv-brand"><img src={logo.url} alt="Dábliu Consórcios" /><div><strong>DÁBLIU</strong><span>CENTRAL DE RESULTADOS</span></div></div><div className="tv-clock"><span>OPERAÇÃO AO VIVO</span><strong>{clock.toLocaleTimeString("pt-BR")}</strong></div><button onClick={onExit}>Sair da TV <X size={16} /></button></div>
    {featuredSale ? <section className="sale-celebration" aria-live="assertive">
      <span className="celebration-live"><i /> NOVA VENDA CONFIRMADA</span>
      <div className="celebration-avatar">{initials(featuredSale.seller)}</div>
      <p>Parabéns,</p><h1>{featuredSale.seller}</h1>
      <strong className="celebration-value">{money(featuredSale.value)}</strong>
      <div className="celebration-meta"><span>{featuredSale.team}</span><i /> <span>{featuredSale.time}</span></div>
      <div className="celebration-timer"><i /><span>O painel retorna automaticamente em 15 segundos</span></div>
    </section> : <>
      <div className="airport-board"><div className="board-title"><span>ÚLTIMAS OPERAÇÕES</span><span><i /> LIVE • ATUALIZAÇÃO AUTOMÁTICA</span></div><div className="board-head"><span>HORA</span><span>VENDEDOR</span><span>SUPERVISOR</span><span>EQUIPE</span><span>VALOR</span><span>STATUS</span></div>{sales.slice(0, 7).map((s, i) => <div className={`board-row ${i === 0 ? "highlight" : ""}`} key={s.id}><strong>{s.time}</strong><span className="board-person"><b>{initials(s.seller)}</b>{s.seller}</span><span>{s.supervisor}</span><span>{s.team}</span><strong className="board-money">{money(s.value)}</strong><span className="board-status"><i /> CONFIRMADA</span></div>)}</div>
      <div className="tv-bottom"><div><span>VENDAS HOJE</span><strong>{todaySales.length}</strong></div><div><span>RESULTADO HOJE</span><strong>{money(todaySales.reduce((a, b) => a + b.value, 0))}</strong></div><div><span>META MENSAL</span><strong>47%</strong></div><div className="tv-message"><Zap size={18} /><span>Nova venda aparece aqui automaticamente</span></div></div>
    </>}
  </div>;
}
