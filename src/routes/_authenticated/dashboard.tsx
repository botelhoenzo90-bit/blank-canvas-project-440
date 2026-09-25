import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
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
  LogOut,
  Plus,
  Search,
  Share2,
  Settings,
  ShieldCheck,
  Smartphone,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createSaleAndNotify, registerPushDevice } from "@/lib/sales.functions";
import { enablePushNotifications } from "@/lib/push";
import { getMyAccess } from "@/lib/auth.functions";
import { PeoplePanel, type Person } from "@/components/people-panel";
import { listPeople } from "@/lib/people.functions";
import { ThemeToggle } from "@/components/theme-toggle";
import logo from "@/assets/dabliu-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dábliu | Central de Resultados Comerciais" },
      { name: "description", content: "Painel de gestão comercial com vendas, metas, rankings, equipes e relatórios." },
      { property: "og:title", content: "Dábliu | Central de Resultados Comerciais" },
      { property: "og:description", content: "Painel de gestão comercial com vendas, metas, rankings, equipes e relatórios." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://comercialdabliuconsorcios.lovable.app/__l5e/assets-v1/10f4a8ff-d9be-4747-8a78-befda610e55e/dabliu-share.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://comercialdabliuconsorcios.lovable.app/__l5e/assets-v1/10f4a8ff-d9be-4747-8a78-befda610e55e/dabliu-share.png" },
    ],
  }),
  component: DabliuApp,
});

type Role = "Presidente/Diretor" | "Super Master" | "Master" | "Representante" | "Supervisor" | "Vendedor";
type View = "dashboard" | "sales" | "ranking" | "goals" | "team" | "reports" | "tv";
const roleKey = (role: Role) => ({ "Presidente/Diretor": "director", "Super Master": "super_master", Master: "master", Representante: "representative", Supervisor: "supervisor", Vendedor: "seller" } as const)[role];

type Sale = {
  id: string;
  seller: string;
  supervisor: string;
  representative: string;
  master: string;
  superMaster: string;
  team: string;
  value: number;
  date: string;
  time: string;
  status: "Confirmada" | "Pendente";
  saleType: "Veículos" | "Imóveis" | "Pesados" | "Outro";
  groupNumber: string;
  sellerCompany: string;
  buyerName: string;
  administrator: string;
  creditValue: number | null;
  paymentMethod: string;
  leadSource: string;
  notes: string;
};

type SaleInput = Pick<Sale, "value" | "status" | "saleType" | "groupNumber" | "sellerCompany" | "buyerName" | "administrator" | "creditValue" | "paymentMethod" | "leadSource" | "notes"> & { sellerId: string };

const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const initials = (name: string) => name.split(" ").map((x) => x[0]).slice(0, 2).join("");
type SaleRow = import("@/integrations/supabase/types").Database["public"]["Tables"]["sales"]["Row"];
const saleFromRow = (row: SaleRow): Sale => ({ id: row.id, seller: row.seller, supervisor: row.supervisor, representative: row.representative, master: row.master, superMaster: row.super_master, team: row.team, value: Number(row.value), date: row.sale_date, time: row.sale_time.slice(0, 5), status: row.status === "Pendente" ? "Pendente" : "Confirmada", saleType: row.sale_type as Sale["saleType"], groupNumber: row.group_number, sellerCompany: row.seller_company, buyerName: row.buyer_name, administrator: row.administrator, creditValue: row.credit_value === null ? null : Number(row.credit_value), paymentMethod: row.payment_method, leadSource: row.lead_source, notes: row.notes });

function DabliuApp() {
  const navigateTo = useNavigate();
  const [view, setView] = useState<View>("dashboard");
  const [role, setRole] = useState<Role | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState(""); const [profilePhone, setProfilePhone] = useState("");
  const [accessLoading, setAccessLoading] = useState(true); const [accessPending, setAccessPending] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [period, setPeriod] = useState("Hoje");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [tvMode, setTvMode] = useState(false);
  const [tvAnnouncement, setTvAnnouncement] = useState<Sale | null>(null);
  const [savingSale, setSavingSale] = useState(false);
  const createSale = useServerFn(createSaleAndNotify);
  const savePushDevice = useServerFn(registerPushDevice);
  const loadAccess = useServerFn(getMyAccess);
  const loadPeople = useServerFn(listPeople);

  const refreshAccess = async () => { const access = await loadAccess(); const nextRole = access.role ? ({ director: "Presidente/Diretor", super_master: "Super Master", master: "Master", representative: "Representante", supervisor: "Supervisor", seller: "Vendedor" } as const)[access.role] : null; setRole(nextRole); if (nextRole === "Vendedor") setView("sales"); setProfileName(access.profile?.full_name ?? ""); setProfileEmail(access.profile?.email ?? ""); setProfilePhone(access.profile?.phone ?? ""); setAccessPending(access.pending); setAccessLoading(false); };
  useEffect(() => { void refreshAccess().catch(() => setAccessLoading(false)); }, []);
  useEffect(() => { if (role && role !== "Vendedor") void loadPeople().then((items) => setPeople(items as Person[])).catch(() => setPeople([])); }, [role]);

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
  const periodSales = useMemo(() => {
    if (period === "Tudo") return sales;
    const days = period === "Hoje" ? 0 : period === "7 dias" ? 6 : 29;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days);
    return sales.filter((sale) => new Date(`${sale.date}T00:00:00`) >= start);
  }, [period, sales]);
  const todaySales = sales.filter((s) => s.date === today);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.value, 0);
  const periodTotal = periodSales.reduce((sum, s) => sum + s.value, 0);
  const avgTicket = periodSales.length ? periodTotal / periodSales.length : 0;

  const registerSale = async (sale: SaleInput) => {
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
  if (!role) return <PendingAccess name={profileName} onExit={signOut} />;
  const canRegisterSale = role !== "Vendedor";
  const sellers = people.filter((person) => person.active && person.role === "seller");

  if (tvMode || view === "tv") {
    return <TvPanel sales={sales} announcement={tvAnnouncement} onExit={() => { setTvMode(false); setView("dashboard"); }} />;
  }

  return (
    <div className="dab-app">
      <aside className={`dab-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="dab-brand"><img src={logo.url} alt="Dábliu Consórcios" /></div>
        <div className="dab-workspace"><span>OPERAÇÃO</span><button><span className="live-dot" /> Operação Principal <ChevronDown size={15} /></button></div>
        <nav>
          {role !== "Vendedor" && <NavItem icon={<LayoutDashboard size={18} />} label="Visão geral" active={view === "dashboard"} onClick={() => navigate("dashboard")} />}
          <NavItem icon={<CircleDollarSign size={18} />} label="Vendas" active={view === "sales"} onClick={() => navigate("sales")} />
          {role !== "Vendedor" && <NavItem icon={<Trophy size={18} />} label="Ranking" active={view === "ranking"} onClick={() => navigate("ranking")} />}
          <NavItem icon={<Target size={18} />} label="Metas" active={view === "goals"} onClick={() => navigate("goals")} />
          {role !== "Vendedor" && <NavItem icon={<Users size={18} />} label="Equipe e acessos" active={view === "team"} onClick={() => navigate("team")} />}
          {role !== "Vendedor" && <NavItem icon={<Activity size={18} />} label="Relatórios" active={view === "reports"} onClick={() => navigate("reports")} />}
          {role !== "Vendedor" && <div className="nav-divider" />}
          {role !== "Vendedor" && <NavItem icon={<MonitorPlay size={18} />} label="Central TV" active={false} onClick={() => { setView("tv"); }} />}
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
             <ThemeToggle />
             <button className="icon-btn" aria-label="Notificações" onClick={() => setShowNotifications((v) => !v)}><Bell size={19} /></button>
             <button className="avatar header-avatar" onClick={() => setShowProfile((value) => !value)} title="Abrir perfil">{initials(profileName || "Usuário")}</button>
          </div>
           {showProfile && <div className="profile-popover"><div className="profile-popover-head"><div className="avatar">{initials(profileName || "Usuário")}</div><div><strong>{profileName || "Usuário"}</strong><span>{role}</span></div><button aria-label="Fechar perfil" onClick={() => setShowProfile(false)}><X size={16} /></button></div><dl><div><dt>E-mail</dt><dd>{profileEmail || "Não informado"}</dd></div><div><dt>Telefone</dt><dd>{profilePhone || "Não informado"}</dd></div></dl><button className="outline-btn profile-signout" onClick={() => void signOut()}><LogOut size={15} /> Sair da conta</button></div>}
           {showNotifications && <div className="notifications"><div className="notif-head"><div><strong>Instalar no celular</strong><span>Faça uma vez para receber as vendas.</span></div><button aria-label="Fechar instruções" onClick={() => setShowNotifications(false)}><X size={16} /></button></div><div className="push-panel"><div className="install-guide"><section><div className="guide-title"><Share2 size={16} /><strong>iPhone</strong><span>Safari</span></div><ol><li>Abra o sistema no <strong>Safari</strong>.</li><li>Toque em <strong>Compartilhar</strong>.</li><li>Escolha <strong>Adicionar à Tela de Início</strong>.</li><li>Abra pelo ícone Dábliu e toque abaixo.</li></ol></section><section><div className="guide-title"><Smartphone size={16} /><strong>Android</strong><span>Chrome</span></div><ol><li>Abra o sistema no <strong>Chrome</strong>.</li><li>Toque no menu de três pontos.</li><li>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li><li>Abra pelo ícone Dábliu e toque abaixo.</li></ol></section></div><button className="primary-btn" onClick={() => void activateNotifications()}><Bell size={16} /> Ativar notificações</button><small>Quando o celular perguntar, escolha <strong>Permitir</strong>.</small></div></div>}
        </header>

        <div className="content">
           <div className="top-toolbar"><div className="periods">{["Hoje", "7 dias", "30 dias", "Tudo"].map((p) => <button className={period === p ? "active" : ""} key={p} onClick={() => setPeriod(p)}>{p}</button>)}</div><div className="toolbar-right">{role !== "Vendedor" && <button className="outline-btn" onClick={() => setTvMode(true)}><MonitorPlay size={16} /> Abrir TV</button>}{canRegisterSale && <button className="primary-btn" onClick={() => setShowSaleModal(true)}><Plus size={17} /> Registrar venda</button>}</div></div>

           {view === "dashboard" && <Dashboard sales={periodSales} todayTotal={todayTotal} periodTotal={periodTotal} avgTicket={avgTicket} period={period} />}
           {view === "sales" && <SalesView sales={periodSales} search={search} setSearch={setSearch} onAdd={canRegisterSale ? () => setShowSaleModal(true) : undefined} />}
           {view === "ranking" && <RankingView sales={periodSales} />}
           {view === "goals" && <GoalsView />}
           {view === "team" && <PeoplePanel role={roleKey(role)} />}
          {view === "reports" && <ReportsView sales={sales} />}
        </div>
      </main>

       {showSaleModal && canRegisterSale && <SaleModal sellers={sellers} onClose={() => setShowSaleModal(false)} onSave={registerSale} saving={savingSale} />}
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) { return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>; }
function PendingAccess({ name, onExit }: { name: string; onExit: () => Promise<void> }) { return <main className="auth-page"><section className="auth-card pending-card"><img src={logo.url} alt="Dábliu Consórcios" className="auth-logo" /><div className="auth-icon"><ShieldCheck /></div><span className="panel-kicker">PERFIL INCOMPLETO</span><h1>Não foi possível abrir seu acesso</h1><p>{name ? `${name}, os dados da sua conta estão incompletos.` : "Os dados da sua conta estão incompletos."} Entre em contato com Presidente/Diretor.</p><button className="outline-btn auth-submit" onClick={() => void onExit()}>Sair</button></section></main>; }
function titleFor(v: View) { return ({ sales: "Vendas", ranking: "Ranking de performance", goals: "Metas e objetivos", team: "Gestão da equipe", reports: "Relatórios" } as Record<string, string>)[v] || "Central de Resultados"; }

function Dashboard({ sales, todayTotal, periodTotal, avgTicket, period }: { sales: Sale[]; todayTotal: number; periodTotal: number; avgTicket: number; period: string }) {
  return <>
    <section className="welcome-strip"><div><span className="eyebrow"><span className="live-dot" /> AO VIVO</span><h2>Central de Resultados</h2><p>Acompanhe a operação comercial em tempo real.</p></div><div className="live-stat"><span>Última atualização</span><strong>agora mesmo</strong></div></section>
    <section className="metric-grid">
       <Metric icon={<CircleDollarSign />} label="Vendas hoje" value={money(todayTotal)} sub={`${sales.filter((sale) => sale.date === new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())).length} operações`} />
       <Metric icon={<CalendarDays />} label={`Resultado · ${period.toLowerCase()}`} value={money(periodTotal)} sub={`${sales.length} operações`} />
       <Metric icon={<Activity />} label="Ticket médio" value={money(avgTicket)} sub="no período selecionado" />
       <Metric icon={<Target />} label="Vendas confirmadas" value={String(sales.filter((sale) => sale.status === "Confirmada").length)} sub="no período selecionado" />
    </section>
    <section className="dashboard-grid lower"><div className="panel ranking-panel"><div className="panel-head"><div><span className="panel-kicker">DESEMPENHO</span><h3>Ranking de vendedores</h3></div></div>{sales.length ? <div className="rank-list">{sellerRanking(sales).slice(0, 5).map((s, i) => <div className="rank-row" key={s.name}><span className={`rank-pos pos-${i + 1}`}>{i + 1}</span><div className="avatar small">{initials(s.name)}</div><div className="rank-name"><strong>{s.name}</strong><span>{s.sales} vendas</span></div><div className="rank-value">{money(s.value)}</div></div>)}</div> : <EmptyState text="O ranking aparecerá após a primeira venda." />}</div><div className="panel feed-panel"><div className="panel-head"><div><span className="panel-kicker">TEMPO REAL</span><h3>Últimas vendas</h3></div><span className="live-badge"><span className="live-dot" /> LIVE</span></div>{sales.length ? <div className="sales-feed">{sales.slice(0, 5).map((s) => <div className="feed-row" key={s.id}><div className="feed-avatar">{initials(s.seller)}</div><div><strong>{s.seller}</strong><span>{s.team} • {s.time}</span></div><strong className="feed-value">+{money(s.value)}</strong></div>)}</div> : <EmptyState text="As vendas registradas aparecerão aqui em tempo real." />}</div></section>
  </>;
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) { return <div className="metric"><div className="metric-top"><div className="metric-icon">{icon}</div></div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-sub">{sub}</span></div>; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><CircleDollarSign size={24} /><p>{text}</p></div>; }

function sellerRanking(sales: Sale[]) { const map = new Map<string, { name: string; value: number; sales: number }>(); sales.forEach((s) => { const old = map.get(s.seller) || { name: s.seller, value: 0, sales: 0 }; old.value += s.value; old.sales += 1; map.set(s.seller, old); }); return [...map.values()].sort((a, b) => b.value - a.value); }

function SalesView({ sales, search, setSearch, onAdd }: { sales: Sale[]; search: string; setSearch: (v: string) => void; onAdd?: () => void }) { const filtered = sales.filter((s) => [s.seller, s.sellerCompany, s.buyerName, s.supervisor, s.team, s.saleType, s.administrator, s.leadSource].join(" ").toLowerCase().includes(search.toLowerCase())); return <section className="panel full-panel"><div className="panel-head"><div><span className="panel-kicker">OPERAÇÃO COMERCIAL</span><h3>Histórico de vendas</h3></div>{onAdd && <button className="primary-btn" onClick={onAdd}><Plus size={16} /> Nova venda</button>}</div><div className="filters"><div className="search"><Search size={17} /><input placeholder="Buscar venda, vendedor, empresa ou equipe" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>{filtered.length ? <DataTable sales={filtered} /> : <EmptyState text="Nenhuma venda encontrada neste período." />}</section>; }

function DataTable({ sales }: { sales: Sale[] }) { return <div className="table-wrap"><table><thead><tr><th>VENDEDOR / EMPRESA</th><th>CLIENTE / CONSÓRCIO</th><th>SUPERVISOR / EQUIPE</th><th>DATA / HORA</th><th>VALOR</th><th>ORIGEM / PAGAMENTO</th><th>STATUS</th></tr></thead><tbody>{sales.map((s) => <tr key={s.id}><td><div className="person-cell"><div className="avatar small">{initials(s.seller)}</div><strong>{s.seller}</strong></div><small className="sale-detail">{s.sellerCompany || "—"}</small></td><td><strong className="sale-type">{s.buyerName || s.saleType}</strong><small className="sale-detail">{[s.saleType, s.administrator, s.groupNumber && `Grupo ${s.groupNumber}`].filter(Boolean).join(" • ") || "—"}</small>{s.notes && <small className="sale-detail">{s.notes}</small>}</td><td>{s.supervisor}<small className="sale-detail">{s.team}</small></td><td>{new Date(`${s.date}T${s.time}`).toLocaleDateString("pt-BR")} <small>{s.time}</small></td><td className="table-value">{money(s.value)}</td><td>{s.leadSource || "—"}<small className="sale-detail">{s.paymentMethod || "—"}</small></td><td><span className={`status ${s.status === "Confirmada" ? "confirmed" : "pending"}`}><i />{s.status}</span></td></tr>)}</tbody></table></div>; }

function RankingView({ sales }: { sales: Sale[] }) { const [type, setType] = useState("Vendedores"); const data = type === "Vendedores" ? sellerRanking(sales) : type === "Supervisores" ? hierarchyRanking(sales, "supervisor") : type === "Representantes" ? hierarchyRanking(sales, "representative") : hierarchyRanking(sales, "master"); const topValue = data[0]?.value ?? 1; return <section className="panel full-panel"><div className="ranking-hero"><div><span className="panel-kicker">PERFORMANCE</span><h3>Ranking por resultado</h3><p>Atualizado automaticamente a cada nova venda.</p></div><Trophy size={42} /></div><div className="rank-tabs">{["Vendedores", "Supervisores", "Representantes", "Masters"].map((x) => <button className={type === x ? "active" : ""} key={x} onClick={() => setType(x)}>{x}</button>)}</div>{data.length ? <div className="leaderboard">{data.map((item, i) => <div className="leader-row" key={item.name}><div className={`leader-place place-${i + 1}`}>{i + 1}</div><div className="avatar">{initials(item.name)}</div><div className="leader-person"><strong>{item.name}</strong><span>{"sales" in item ? `${item.sales} vendas` : "Estrutura comercial"}</span></div><div className="leader-bar"><i style={{ width: `${Math.max(12, (item.value / topValue) * 100)}%` }} /></div><strong className="leader-money">{money(item.value)}</strong></div>)}</div> : <EmptyState text="O ranking será formado pelas vendas reais." />}</section>; }
function hierarchyRanking(sales: Sale[], key: keyof Sale) { const map = new Map<string, { name: string; value: number }>(); sales.forEach((s) => { const name = String(s[key]); const old = map.get(name) || { name, value: 0 }; old.value += s.value; map.set(name, old); }); return [...map.values()].sort((a, b) => b.value - a.value); }

function GoalsView() { return <section className="panel full-panel"><div className="panel-head"><div><span className="panel-kicker">OBJETIVOS</span><h3>Metas comerciais</h3></div></div><EmptyState text="Nenhuma meta foi cadastrada. Esta tela exibirá apenas metas reais." /></section>; }

function ReportsView({ sales }: { sales: Sale[] }) { const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [status, setStatus] = useState("Todos"); const filtered = sales.filter((s) => (!start || s.date >= start) && (!end || s.date <= end) && (status === "Todos" || s.status === status)); const total = filtered.reduce((a, b) => a + b.value, 0); const csvCell = (value: string | number | null) => `"${String(value ?? "").replaceAll('"', '""')}"`; const exportCsv = () => { const csv = ["Vendedor;Empresa;Cliente;Supervisor;Representante;Master;Super Master;Equipe;Tipo;Administradora;Grupo;Valor;Pagamento;Origem;Observação;Data;Hora;Status", ...filtered.map((s) => [s.seller, s.sellerCompany, s.buyerName, s.supervisor, s.representative, s.master, s.superMaster, s.team, s.saleType, s.administrator, s.groupNumber, s.value, s.paymentMethod, s.leadSource, s.notes, s.date, s.time, s.status].map(csvCell).join(";"))].join("\n"); const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "dabliu-relatorio.csv"; a.click(); URL.revokeObjectURL(a.href); toast.success("Relatório exportado", { description: "Arquivo compatível com Excel." }); }; return <section className="report-grid"><div className="panel full-panel print-report"><div className="print-heading"><img src={logo.url} alt="Dábliu Consórcios" /><div><h2>Relatório de performance comercial</h2><span>Emitido em {new Date().toLocaleDateString("pt-BR")}</span></div></div><div className="panel-head"><div><span className="panel-kicker">RELATÓRIOS</span><h3>Performance comercial</h3></div><div className="export-actions"><button className="outline-btn" onClick={exportCsv}><FileSpreadsheet size={16} /> Planilha</button><button className="outline-btn" onClick={() => window.print()}><Download size={16} /> Salvar PDF</button></div></div><div className="report-filters"><div><label>Data inicial</label><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div><div><label>Data final</label><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div><div><label>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)}><option>Todos</option><option>Confirmada</option><option>Pendente</option></select></div></div><div className="report-summary"><div><span>Total vendido</span><strong>{money(total)}</strong></div><div><span>Vendas</span><strong>{filtered.length}</strong></div><div><span>Ticket médio</span><strong>{money(filtered.length ? total / filtered.length : 0)}</strong></div><div><span>Confirmadas</span><strong>{filtered.filter((s) => s.status === "Confirmada").length}</strong></div></div><DataTable sales={filtered} /></div></section>; }

function SaleModal({ sellers, onClose, onSave, saving }: { sellers: Person[]; onClose: () => void; onSave: (s: SaleInput) => Promise<void>; saving: boolean }) { const [sellerId, setSellerId] = useState(sellers[0]?.user_id ?? ""); const [sellerCompany, setSellerCompany] = useState(""); const [buyerName, setBuyerName] = useState(""); const [value, setValue] = useState(""); const [saleType, setSaleType] = useState<Sale["saleType"]>("Veículos"); const [groupNumber, setGroupNumber] = useState(""); const [administrator, setAdministrator] = useState(""); const [paymentMethod, setPaymentMethod] = useState(""); const [leadSource, setLeadSource] = useState(""); const [notes, setNotes] = useState(""); const selectedSeller = sellers.find((seller) => seller.user_id === sellerId); const submit = (e: React.FormEvent) => { e.preventDefault(); void onSave({ sellerId, sellerCompany, buyerName, value: Number(value), status: "Confirmada", saleType, groupNumber, administrator, creditValue: null, paymentMethod, leadSource, notes }); }; return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="sale-modal sale-modal-wide" onSubmit={submit}><div className="modal-head"><div><span className="panel-kicker">NOVA OPERAÇÃO</span><h3>Registrar venda</h3><p>Selecione o vendedor; a hierarquia será preenchida automaticamente.</p></div><button type="button" onClick={onClose}><X size={19} /></button></div><div className="form-grid"><label>Vendedor<select value={sellerId} onChange={(e) => setSellerId(e.target.value)} required autoFocus><option value="">Selecione</option>{sellers.map((seller) => <option value={seller.user_id} key={seller.user_id}>{seller.full_name}</option>)}</select></label><label>Empresa que vendeu<input value={sellerCompany} onChange={(e) => setSellerCompany(e.target.value)} maxLength={120} placeholder="Nome da empresa" required /></label><label>Nome do cliente<input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} maxLength={120} placeholder="Nome do cliente" required /></label><label>Equipe<input value={selectedSeller?.team || "Sem equipe definida"} readOnly /></label><label>Tipo da venda<select value={saleType} onChange={(e) => setSaleType(e.target.value as Sale["saleType"])} required><option>Veículos</option><option>Imóveis</option><option>Pesados</option><option>Outro</option></select></label><label>Valor da venda<input type="number" min="1" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" required /></label><label>Administradora<input value={administrator} onChange={(e) => setAdministrator(e.target.value)} maxLength={120} placeholder="Nome da administradora" /></label><label>Grupo<input value={groupNumber} onChange={(e) => setGroupNumber(e.target.value)} maxLength={40} placeholder="Número do grupo" /></label><label>Forma de pagamento<input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} maxLength={80} placeholder="Ex.: PIX, boleto" /></label><label>Origem do cliente<input value={leadSource} onChange={(e) => setLeadSource(e.target.value)} maxLength={100} placeholder="Ex.: indicação, Instagram" /></label><label className="full-field">Observação<textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} placeholder="Informações importantes sobre a venda" /></label></div><div className="modal-note"><Zap size={17} /><span><strong>Tempo real ativado.</strong> A venda aparecerá automaticamente na Central TV.</span></div><div className="modal-actions"><button type="button" className="outline-btn" onClick={onClose} disabled={saving}>Cancelar</button><button className="primary-btn" disabled={saving || !value || !sellerId || !sellerCompany || !buyerName}><Check size={16} /> {saving ? "Confirmando..." : "Confirmar venda"}</button></div></form></div>; }

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
    <div className="tv-top"><div className="tv-brand"><img src={logo.url} alt="Dábliu Consórcios" /></div><div className="tv-clock"><span>OPERAÇÃO AO VIVO</span><strong>{clock.toLocaleTimeString("pt-BR")}</strong></div><ThemeToggle className="tv-theme-toggle" /><button onClick={onExit}>Sair da TV <X size={16} /></button></div>
    {featuredSale ? <section className="sale-celebration" aria-live="assertive">
      <span className="celebration-live"><i /> NOVA VENDA CONFIRMADA</span>
      <div className="celebration-avatar">{initials(featuredSale.seller)}</div>
      <p>Parabéns,</p><h1>{featuredSale.seller}</h1>
      <strong className="celebration-value">{money(featuredSale.value)}</strong>
      <div className="celebration-meta"><span>{featuredSale.saleType}</span><i /><span>{featuredSale.team}</span><i /> <span>{featuredSale.time}</span></div>
      <div className="celebration-timer"><i /><span>O painel retorna automaticamente em 15 segundos</span></div>
    </section> : <>
      <div className="airport-board"><div className="board-title"><span>ÚLTIMAS OPERAÇÕES</span><span><i /> AO VIVO • ATUALIZAÇÃO AUTOMÁTICA</span></div><div className="board-head"><span>HORA</span><span>VENDEDOR</span><span>TIPO</span><span>EQUIPE</span><span>VALOR</span><span>STATUS</span></div>{sales.length ? sales.slice(0, 7).map((s, i) => <div className={`board-row ${i === 0 ? "highlight" : ""}`} key={s.id}><strong>{s.time}</strong><span className="board-person"><b>{initials(s.seller)}</b>{s.seller}</span><span>{s.saleType}</span><span>{s.team}</span><strong className="board-money">{money(s.value)}</strong><span className="board-status"><i /> CONFIRMADA</span></div>) : <div className="tv-empty"><CircleDollarSign size={34} /><strong>Aguardando a primeira venda</strong><span>As novas operações aparecerão aqui automaticamente.</span></div>}</div>
      <div className="tv-bottom"><div><span>VENDAS HOJE</span><strong>{todaySales.length}</strong></div><div><span>RESULTADO HOJE</span><strong>{money(todaySales.reduce((a, b) => a + b.value, 0))}</strong></div><div><span>VENDAS REGISTRADAS</span><strong>{sales.length}</strong></div><div className="tv-message"><Zap size={18} /><span>Nova venda aparece aqui automaticamente</span></div></div>
    </>}
  </div>;
}
