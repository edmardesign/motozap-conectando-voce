import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
// Bootstrap do primeiro admin foi movido para POST /api/public/bootstrap-admin
// (endpoint server-side gated por X-Bootstrap-Token). Esta tela executa
// exclusivamente signInWithPassword — nunca recria/redefine a senha.
import { formatBRL, whatsappLink } from "@/lib/pricing";
import { formatarTelefone, formatarPlaca, formatarCpf, formatarDocumento } from "@/utils/formatters";
import { LocationPicker } from "@/components/location-picker";
import { EmojiIcon } from "@/components/emoji-icon";
import { getMeuContextoAdmin } from "@/lib/admin-hier.functions";
import { ativarAcessoAdmin } from "@/lib/admin-ativar.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Painel" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const LOGIN_ATTEMPTS_KEY = "admin_login_attempts_v1";
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 min
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min

type AttemptState = { attempts: number[]; lockedUntil: number };

function readAttempts(): AttemptState {
  if (typeof window === "undefined") return { attempts: [], lockedUntil: 0 };
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (!raw) return { attempts: [], lockedUntil: 0 };
    const parsed = JSON.parse(raw) as AttemptState;
    return {
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      lockedUntil: typeof parsed.lockedUntil === "number" ? parsed.lockedUntil : 0,
    };
  } catch {
    return { attempts: [], lockedUntil: 0 };
  }
}

function writeAttempts(state: AttemptState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(state));
}

type Tab =
  | "dashboard"
  | "cidades"
  | "mototaxistas"
  | "mensalidades"
  | "recargas"
  | "saques"
  | "sorteios"
  | "parceiros"
  | "corridas"
  | "config";

function AdminPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setChecking(false); return; }
      // Redirecionamento por nível (Rodada 2.B/2.C).
      try {
        const ctx = await getMeuContextoAdmin();
        if (ctx.is_principal) {
          navigate({ to: "/adm/gestao", replace: true });
          return;
        }
        if (ctx.nivel === "subadmin" || ctx.nivel === "embaixador") {
          navigate({ to: "/adm/painel", replace: true });
          return;
        }
      } catch { /* segue para verificação legada */ }
      const { data: prof } = await supabase
        .from("profiles")
        .select("tipo")
        .eq("id", data.user.id)
        .maybeSingle();
      setAuthed(prof?.tipo === "admin");
      setChecking(false);
    })();
  }, [navigate]);

  if (checking) return <div className="min-h-screen flex items-center justify-center text-foreground">Carregando…</div>;
  if (!authed) return <AdminLogin onAuthed={() => setAuthed(true)} />;
  return <AdminShell onLogout={() => setAuthed(false)} />;
}

/* ============================ LOGIN ============================ */
function AdminLogin({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"entrar" | "ativar">("entrar");
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-background text-foreground">
      <div className="w-full max-w-sm rounded-2xl p-6 bg-card border border-white/10 space-y-4">
        <h1 className="text-2xl font-bold text-center"><EmojiIcon e="🔐" /> Painel Administrativo</h1>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setMode("entrar")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === "entrar" ? "bg-neon text-neon-foreground" : "text-muted-foreground"
            }`}
          >
            Já tenho acesso
          </button>
          <button
            type="button"
            onClick={() => setMode("ativar")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === "ativar" ? "bg-neon text-neon-foreground" : "text-muted-foreground"
            }`}
          >
            Ativar meu acesso
          </button>
        </div>
        {mode === "entrar" ? <AdminLoginForm onAuthed={onAuthed} /> : <AdminAtivarWizard onAuthed={onAuthed} />}
        <Link to="/splash" className="block text-center text-xs text-muted-foreground hover:text-foreground">
          Voltar
        </Link>
      </div>
    </main>
  );
}

function AdminLoginForm({ onAuthed }: { onAuthed: () => void }) {
  const navigate = useNavigate();
  // Login unificado telefone (11 dígitos) + PIN 4 dígitos, com fallback e-mail/senha
  // para o admin principal (que foi criado via bootstrap com senha master).
  const [tel, setTel] = useState("");
  const [pin, setPin] = useState("");
  const [emailMaster, setEmailMaster] = useState("");
  const [senhaMaster, setSenhaMaster] = useState("");
  const [usarMaster, setUsarMaster] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number>(() => readAttempts().lockedUntil);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = lockedUntil > now;
  const remainingMin = Math.max(1, Math.ceil((lockedUntil - now) / 60000));

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const state = readAttempts();
    if (state.lockedUntil > Date.now()) {
      setLockedUntil(state.lockedUntil);
      toast.error("Muitas tentativas. Tente novamente em 15 minutos.");
      return;
    }
    setLoading(true);
    try {
      let email = emailMaster.trim();
      let password = senhaMaster;
      if (!usarMaster) {
        const digits = tel.replace(/\D/g, "");
        if (digits.length < 10) { toast.error("Telefone inválido"); return; }
        if (!/^\d{4}$/.test(pin)) { toast.error("PIN deve ter 4 dígitos"); return; }
        email = `${digits}@motezap.app`;
        password = pin;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const cutoff = Date.now() - ATTEMPT_WINDOW_MS;
        const recent = state.attempts.filter((t) => t > cutoff);
        recent.push(Date.now());
        if (recent.length >= MAX_ATTEMPTS) {
          const lockUntil = Date.now() + LOCKOUT_MS;
          writeAttempts({ attempts: [], lockedUntil: lockUntil });
          setLockedUntil(lockUntil);
          toast.error("Muitas tentativas. Tente novamente em 15 minutos.");
        } else {
          writeAttempts({ attempts: recent, lockedUntil: 0 });
          toast.error("Credenciais inválidas");
        }
        return;
      }
      writeAttempts({ attempts: [], lockedUntil: 0 });
      try {
        const ctx = await getMeuContextoAdmin();
        if (ctx.is_principal) { navigate({ to: "/adm/gestao", replace: true }); return; }
        if (ctx.nivel === "subadmin" || ctx.nivel === "embaixador") {
          navigate({ to: "/adm/painel", replace: true }); return;
        }
      } catch { /* fluxo legacy */ }
      onAuthed();
    } catch (err) {
      toast.error("Erro ao entrar");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-3">
      {!usarMaster ? (
        <>
          <input
            type="tel"
            required
            value={tel}
            onChange={(e) => setTel(formatarTelefone(e.target.value))}
            placeholder="(XX) XXXXX-XXXX"
            autoComplete="tel"
            disabled={isLocked}
            className="w-full rounded-lg bg-white/10 px-3 py-3 outline-none disabled:opacity-50"
          />
          <input
            type="password"
            required
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="PIN 4 dígitos"
            autoComplete="current-password"
            disabled={isLocked}
            className="w-full rounded-lg bg-white/10 px-3 py-3 outline-none disabled:opacity-50 tracking-widest text-center"
          />
        </>
      ) : (
        <>
          <input
            type="email"
            required
            value={emailMaster}
            onChange={(e) => setEmailMaster(e.target.value)}
            placeholder="e-mail master"
            autoComplete="off"
            disabled={isLocked}
            className="w-full rounded-lg bg-white/10 px-3 py-3 outline-none disabled:opacity-50"
          />
          <input
            type="password"
            required
            value={senhaMaster}
            onChange={(e) => setSenhaMaster(e.target.value)}
            placeholder="senha master"
            autoComplete="current-password"
            disabled={isLocked}
            className="w-full rounded-lg bg-white/10 px-3 py-3 outline-none disabled:opacity-50"
          />
        </>
      )}
      {isLocked && (
        <p className="text-sm text-red-400 text-center">
          Muitas tentativas. Tente novamente em {remainingMin} minuto{remainingMin > 1 ? "s" : ""}.
        </p>
      )}
      <button type="submit" disabled={loading || isLocked} className="btn-cta w-full disabled:opacity-50">
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <button
        type="button"
        onClick={() => setUsarMaster((v) => !v)}
        className="w-full text-xs text-muted-foreground hover:text-foreground"
      >
        {usarMaster ? "Usar telefone + PIN" : "Sou o administrador principal (e-mail master)"}
      </button>
    </form>
  );
}

function AdminAtivarWizard({ onAuthed }: { onAuthed: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tel, setTel] = useState("");
  const [codigo, setCodigo] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAtivar(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== pin2) { toast.error("Os PINs não coincidem."); return; }
    setLoading(true);
    try {
      const res = await ativarAcessoAdmin({
        data: {
          telefone: tel.replace(/\D/g, ""),
          codigo,
          pin,
        },
      });
      const { error } = await supabase.auth.signInWithPassword({ email: res.email, password: pin });
      if (error) throw new Error("Ativação concluída, mas não foi possível entrar. Tente pela aba 'Já tenho acesso'.");
      toast.success("Acesso ativado! Bem-vindo.");
      try {
        const ctx = await getMeuContextoAdmin();
        if (ctx.is_principal) { navigate({ to: "/adm/gestao", replace: true }); return; }
        if (ctx.nivel === "subadmin" || ctx.nivel === "embaixador") {
          navigate({ to: "/adm/painel", replace: true }); return;
        }
      } catch { /* segue */ }
      onAuthed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na ativação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleAtivar} className="space-y-3">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1 flex-1 rounded ${step >= (n as 1|2|3) ? "bg-neon" : "bg-white/15"}`} />
        ))}
      </div>

      {step === 1 && (
        <>
          <p className="text-xs text-muted-foreground">Digite o telefone cadastrado pelo administrador principal.</p>
          <input
            type="tel"
            required
            value={tel}
            onChange={(e) => setTel(formatarTelefone(e.target.value))}
            placeholder="(XX) XXXXX-XXXX"
            autoComplete="tel"
            className="w-full rounded-lg bg-white/10 px-3 py-3 outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (tel.replace(/\D/g, "").length < 10) return toast.error("Telefone inválido");
              setStep(2);
            }}
            className="btn-cta w-full"
          >
            Próximo
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-xs text-muted-foreground">Informe o código de 6 dígitos recebido do administrador.</p>
          <input
            type="text"
            required
            inputMode="numeric"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-full rounded-lg bg-white/10 px-3 py-3 outline-none tracking-[0.5em] text-center text-xl"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-lg bg-white/10 py-3 text-sm">Voltar</button>
            <button
              type="button"
              onClick={() => {
                if (!/^\d{6}$/.test(codigo)) return toast.error("Código deve ter 6 dígitos");
                setStep(3);
              }}
              className="btn-cta flex-1"
            >
              Próximo
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p className="text-xs text-muted-foreground">Defina seu PIN de 4 dígitos. Ele será a sua senha de acesso.</p>
          <input
            type="password"
            required
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Novo PIN"
            className="w-full rounded-lg bg-white/10 px-3 py-3 outline-none tracking-widest text-center"
          />
          <input
            type="password"
            required
            inputMode="numeric"
            maxLength={4}
            value={pin2}
            onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Confirme o PIN"
            className="w-full rounded-lg bg-white/10 px-3 py-3 outline-none tracking-widest text-center"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-lg bg-white/10 py-3 text-sm">Voltar</button>
            <button type="submit" disabled={loading || pin.length !== 4} className="btn-cta flex-1 disabled:opacity-50">
              {loading ? "Ativando…" : "Ativar e entrar"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}


/* ============================ SHELL ============================ */
function AdminShell({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");

  const tabs: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "cidades", label: "Cidades e tarifas" },
    { key: "mototaxistas", label: "Mototaxistas" },
    { key: "mensalidades", label: "Mensalidades" },
    { key: "recargas", label: "Recargas" },
    { key: "saques", label: "Saques" },
    { key: "sorteios", label: "Sorteios" },
    { key: "parceiros", label: "Parceiros" },
    { key: "corridas", label: "Corridas" },
    { key: "config", label: "Config" },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">InterGO • Admin</h1>
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={async () => {
            await supabase.auth.signOut();
            onLogout();
          }}
        >
          Sair
        </button>
      </header>

      <nav className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-white/10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${
              tab === t.key ? "bg-neon text-neon-foreground font-bold" : "bg-white/10 text-foreground/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="px-4 py-5 space-y-4">
        {tab === "dashboard" && <Dashboard />}
        {tab === "cidades" && <CidadesTab />}
        {tab === "mototaxistas" && <MototaxistasTab />}
        {tab === "mensalidades" && <MensalidadesTab />}
        {tab === "recargas" && <RecargasTab />}
        {tab === "saques" && <SaquesTab />}
        {tab === "sorteios" && <SorteiosTab />}
        {tab === "parceiros" && <ParceirosTab />}
        {tab === "corridas" && <CorridasTab />}
        {tab === "config" && <ConfigTab />}
      </section>
    </main>
  );
}

/* ============================ DASHBOARD ============================ */
function Dashboard() {
  const [m, setM] = useState({
    hoje_total: 0,
    hoje_concluidas: 0,
    hoje_canceladas: 0,
    online: 0,
    receita_mensal: 0,
    saldo_passageiros: 0,
    saldo_mototaxistas: 0,
    custo_gratuitas: 0,
    recargas_pendentes: 0,
    saques_pendentes: 0,
  });

  useEffect(() => {
    (async () => {
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);

      const db = supabase as any;
      const [
        cHoje, cConc, cCanc, cOn, cAtivos,
        carPass, carMot, gratMes, recPend, sqPend,
      ] = await Promise.all([
        supabase.from("corridas").select("id", { count: "exact", head: true }).gte("criado_em", hoje.toISOString()),
        supabase.from("corridas").select("id", { count: "exact", head: true }).eq("status", "concluida").gte("criado_em", hoje.toISOString()),
        supabase.from("corridas").select("id", { count: "exact", head: true }).eq("status", "cancelada").gte("criado_em", hoje.toISOString()),
        supabase.from("mototaxistas").select("id", { count: "exact", head: true }).eq("status", "disponivel"),
        supabase.from("mototaxistas").select("id", { count: "exact", head: true }).eq("mensalidade_ativa", true),
        supabase.from("carteira_passageiro").select("saldo_disponivel"),
        supabase.from("carteira_mototaxista").select("saldo_disponivel"),
        supabase.from("corridas").select("valor_final,valor_estimado").eq("eh_gratuita", true).eq("status", "concluida").gte("criado_em", inicioMes.toISOString()),
        supabase.from("transacoes_carteira_passageiro").select("id", { count: "exact", head: true }).eq("status", "pendente").like("tipo", "recarga_%"),
        supabase.from("solicitacoes_saque").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      ]);

      const somaP = (carPass.data ?? []).reduce((a, r) => a + Number(r.saldo_disponivel ?? 0), 0);
      const somaM = (carMot.data ?? []).reduce((a, r) => a + Number(r.saldo_disponivel ?? 0), 0);
      const custo = (gratMes.data ?? []).reduce((a, r: any) => a + Number(r.valor_final ?? r.valor_estimado ?? 0), 0);

      setM({
        hoje_total: cHoje.count ?? 0,
        hoje_concluidas: cConc.count ?? 0,
        hoje_canceladas: cCanc.count ?? 0,
        online: cOn.count ?? 0,
        receita_mensal: (cAtivos.count ?? 0) * 49,
        saldo_passageiros: somaP,
        saldo_mototaxistas: somaM,
        custo_gratuitas: custo,
        recargas_pendentes: recPend.count ?? 0,
        saques_pendentes: sqPend.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Corridas hoje", value: `${m.hoje_concluidas}/${m.hoje_total}`, sub: `${m.hoje_canceladas} canceladas` },
    { label: "Mototaxistas online", value: m.online },
    { label: "Receita mensal estimada", value: formatBRL(m.receita_mensal) },
    { label: "Saldo passageiros", value: formatBRL(m.saldo_passageiros) },
    { label: "Saldo mototaxistas", value: formatBRL(m.saldo_mototaxistas) },
    { label: "Custo corridas grátis (mês)", value: formatBRL(m.custo_gratuitas) },
    { label: "Recargas pendentes", value: m.recargas_pendentes, alert: m.recargas_pendentes > 0 },
    { label: "Saques pendentes", value: m.saques_pendentes, alert: m.saques_pendentes > 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl bg-card p-4 border border-white/10 relative">
          {c.alert && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          <div className="text-xs text-muted-foreground">{c.label}</div>
          <div className="text-xl font-bold mt-1">{c.value}</div>
          {c.sub && <div className="text-[10px] text-muted-foreground mt-1">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/* ============================ MOTOTAXISTAS ============================ */
function MototaxistasTab() {
  const [filtro, setFiltro] = useState<"todos" | "ativos" | "bloqueados" | "pendentes" | "pagamento_declarado" | "com_cnh" | "sem_cnh" | "comissao_bloqueada">("todos");
  const [lista, setLista] = useState<any[]>([]);

  async function carregar() {
    const { data } = await supabase
      .from("mototaxistas")
      .select("id, status, mensalidade_ativa, pagamento_declarado, pagamento_declarado_em, plano, atualizado_em, numero_cnh, cnh_informada_em, modelo_moto, placa_moto, ano_moto, cpf, endereco, corridas_desde_pagamento, conta_bloqueada_comissao, total_corridas, profiles!inner(nome, telefone, foto_url, ativo, cidade, estado)")
      .order("atualizado_em", { ascending: false });
    setLista(data ?? []);
  }
  useEffect(() => { carregar(); }, []);

  const filtrados = useMemo(() => {
    return lista.filter((r) => {
      if (filtro === "ativos") return r.mensalidade_ativa;
      if (filtro === "bloqueados") return !r.mensalidade_ativa && r.profiles.ativo;
      if (filtro === "pendentes") return !r.mensalidade_ativa;
      if (filtro === "pagamento_declarado") return r.pagamento_declarado && !r.mensalidade_ativa;
      if (filtro === "com_cnh") return !!r.numero_cnh;
      if (filtro === "sem_cnh") return !r.numero_cnh;
      if (filtro === "comissao_bloqueada") return r.conta_bloqueada_comissao;
      return true;
    });
  }, [lista, filtro]);

  function diasDoPlano(plano: string | null): number {
    if (plano === "prata") return 180;
    if (plano === "ouro") return 365;
    return 30;
  }

  async function confirmarPagamento(id: string, plano: string | null) {
    const planoFinal = plano ?? "mensal";
    const { error } = await supabase.rpc("admin_confirmar_pagamento_mototaxista", {
      _id: id,
      _plano: planoFinal as any,
      _dias: diasDoPlano(planoFinal),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Pagamento confirmado! Acesso liberado.");
    carregar();
  }

  async function bloquear(id: string) {
    const { error } = await supabase.from("mototaxistas").update({ mensalidade_ativa: false }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Bloqueado"); carregar(); }
  }

  async function confirmarComissao(id: string) {
    if (!confirm("Confirmar recebimento de R$10 de comissão? Isso reseta o ciclo e desbloqueia o mototaxista.")) return;
    const { error } = await supabase.rpc("admin_confirmar_pagamento_comissao", { _mototaxista_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Comissão confirmada, mototaxista liberado.");
    carregar();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto">
        {(["todos","pagamento_declarado","ativos","bloqueados","pendentes","com_cnh","sem_cnh","comissao_bloqueada"] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f as any)} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filtro===f?"bg-neon text-neon-foreground font-bold":"bg-white/10"}`}>
            {f === "pagamento_declarado" ? "Pagamento declarado" : f === "com_cnh" ? "Com CNH" : f === "sem_cnh" ? "Sem CNH" : f === "comissao_bloqueada" ? "Bloqueado comissão" : f}
          </button>
        ))}
      </div>
      {filtrados.length === 0 && <p className="text-muted-foreground text-sm">Nenhum mototaxista.</p>}
      {filtrados.map((m: any) => (
        <div key={m.id} className="rounded-xl bg-card p-3 flex items-center gap-3">
          {m.profiles.foto_url
            ? <img src={m.profiles.foto_url} className="w-12 h-12 rounded-full object-cover" />
            : <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"><EmojiIcon e="🏍️" /></div>}
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate flex items-center gap-2 flex-wrap">
              {m.profiles.nome}
              {m.pagamento_declarado && !m.mensalidade_ativa && (
                <span className="text-[10px] bg-yellow-400 text-black font-bold px-1.5 py-0.5 rounded">
                  <EmojiIcon e="💸" /> PAGAMENTO DECLARADO
                </span>
              )}
              {m.numero_cnh ? (
                <span className="text-[10px] bg-green-500 text-black font-bold px-1.5 py-0.5 rounded">
                  CNH <EmojiIcon e="✅" />
                </span>
              ) : (
                <span className="text-[10px] bg-orange-500 text-black font-bold px-1.5 py-0.5 rounded">
                  CNH <EmojiIcon e="⚠️" /> pendente
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{formatarTelefone(m.profiles.telefone)} • {m.status} • plano: {m.plano ?? "—"}</div>
            <div className="text-[10px]">Mensalidade: {m.mensalidade_ativa ? "ativa" : "inativa"}</div>
            <div className="text-[10px]" style={{ color: m.conta_bloqueada_comissao ? "#FFB4B4" : m.corridas_desde_pagamento >= 15 ? "#FFD27A" : "rgba(255,255,255,0.6)" }}>
              Comissão: {m.corridas_desde_pagamento ?? 0}/20 corridas
              {m.conta_bloqueada_comissao ? " • BLOQUEADO (deve R$10)" : ""}
              {typeof m.total_corridas === "number" ? ` • total ${m.total_corridas}` : ""}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {m.modelo_moto ? `${m.modelo_moto} ${m.ano_moto ?? ""} ${m.placa_moto ? formatarPlaca(m.placa_moto) : ""}` : ""}
              {m.numero_cnh ? ` • CNH: ${m.numero_cnh}` : ""}
              {m.cpf ? ` • CPF: ${formatarCpf(m.cpf)}` : ""}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {m.pagamento_declarado && !m.mensalidade_ativa && (
              <button onClick={() => confirmarPagamento(m.id, m.plano)} className="text-xs bg-green-500 text-black px-2 py-1 rounded font-bold whitespace-nowrap">
                <EmojiIcon e="✅" /> Confirmar pagamento
              </button>
            )}
            {!m.pagamento_declarado && !m.mensalidade_ativa && (
              <button onClick={() => confirmarPagamento(m.id, m.plano)} className="text-xs bg-white/10 text-foreground px-2 py-1 rounded whitespace-nowrap">
                Aprovar manual
              </button>
            )}
            {m.mensalidade_ativa && (
              <button onClick={() => bloquear(m.id)} className="text-xs bg-red-500 text-foreground px-2 py-1 rounded">Bloquear</button>
            )}
            {m.conta_bloqueada_comissao && (
              <button onClick={() => confirmarComissao(m.id)} className="text-xs bg-yellow-400 text-black px-2 py-1 rounded font-bold whitespace-nowrap">
                <EmojiIcon e="💰" /> Recebi R$10
              </button>
            )}
            {!m.conta_bloqueada_comissao && (m.corridas_desde_pagamento ?? 0) > 0 && (
              <button onClick={() => confirmarComissao(m.id)} className="text-xs bg-white/10 text-foreground px-2 py-1 rounded whitespace-nowrap" title="Zerar ciclo">
                Zerar ciclo
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================ MENSALIDADES ============================ */
function MensalidadesTab() {
  const [lista, setLista] = useState<any[]>([]);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));

  async function carregar() {
    const ini = `${mes}-01`;
    const [y, m] = mes.split("-").map(Number);
    const fimDate = new Date(y, m, 0).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("mensalidades")
      .select("id, valor, status, vencimento, pago_em, profiles!inner(nome)")
      .gte("vencimento", ini)
      .lte("vencimento", fimDate)
      .order("vencimento");
    setLista(data ?? []);
  }
  useEffect(() => { carregar(); }, [mes]);

  async function marcarPago(id: string) {
    const { error } = await supabase.rpc("admin_marcar_mensalidade_paga", { _id: id });
    if (error) toast.error(error.message); else { toast.success("Pago"); carregar(); }
  }

  const cor: Record<string, string> = { pago: "bg-green-500", pendente: "bg-yellow-500", vencido: "bg-red-500" };

  return (
    <div className="space-y-3">
      <input type="month" value={mes} onChange={(e)=>setMes(e.target.value)} className="bg-white/10 px-3 py-2 rounded" />
      {lista.length === 0 && <p className="text-muted-foreground text-sm">Sem mensalidades.</p>}
      {lista.map((r: any) => (
        <div key={r.id} className="rounded-xl bg-card p-3 flex items-center justify-between">
          <div>
            <div className="font-bold">{r.profiles.nome}</div>
            <div className="text-xs text-muted-foreground">Vencimento: {r.vencimento} • {formatBRL(Number(r.valor))}</div>
          </div>
          <div className="flex gap-2 items-center">
            <span className={`text-[10px] px-2 py-1 rounded text-black font-bold ${cor[r.status]}`}>{r.status}</span>
            {r.status !== "pago" && <button onClick={()=>marcarPago(r.id)} className="text-xs bg-neon text-neon-foreground font-bold px-2 py-1 rounded">Marcar pago</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================ RECARGAS ============================ */
function RecargasTab() {
  const [lista, setLista] = useState<any[]>([]);
  const [motivo, setMotivo] = useState<Record<string, string>>({});

  async function carregar() {
    const { data } = await supabase
      .from("transacoes_carteira_passageiro")
      .select("id, valor, tipo, criado_em, descricao, profiles!inner(nome, foto_url)")
      .eq("status", "pendente").like("tipo", "recarga_%")
      .order("criado_em", { ascending: false });
    setLista(data ?? []);
  }
  useEffect(() => { carregar(); }, []);

  async function confirmar(id: string) {
    const { error } = await supabase.rpc("admin_confirmar_recarga", { _id: id });
    if (error) toast.error(error.message); else { toast.success("Confirmado"); carregar(); }
  }
  async function rejeitar(id: string) {
    const obs = motivo[id]; if (!obs) { toast.error("Motivo obrigatório"); return; }
    const { error } = await supabase.from("transacoes_carteira_passageiro")
      .update({ status: "rejeitado", descricao: `Rejeitada: ${obs}` }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Rejeitada"); carregar(); }
  }

  return (
    <div className="space-y-3">
      {lista.length === 0 && <p className="text-muted-foreground text-sm">Sem recargas pendentes.</p>}
      {lista.map((r: any) => (
        <div key={r.id} className="rounded-xl bg-card p-3 space-y-2">
          <div className="flex items-center gap-2">
            {r.profiles.foto_url ? <img src={r.profiles.foto_url} className="w-9 h-9 rounded-full" /> : <div className="w-9 h-9 rounded-full bg-white/10" />}
            <div className="flex-1">
              <div className="font-bold">{r.profiles.nome}</div>
              <div className="text-xs text-muted-foreground">{formatBRL(Number(r.valor))} • {r.tipo.replace("recarga_","")}</div>
            </div>
          </div>
          <input value={motivo[r.id] ?? ""} onChange={(e)=>setMotivo(s=>({...s,[r.id]:e.target.value}))} placeholder="Motivo (se rejeitar)" className="w-full bg-white/10 rounded px-2 py-1 text-xs" />
          <div className="flex gap-2">
            <button onClick={()=>confirmar(r.id)} className="flex-1 bg-green-500 text-black font-bold py-1 rounded text-sm">Confirmar</button>
            <button onClick={()=>rejeitar(r.id)} className="flex-1 bg-red-500 text-foreground py-1 rounded text-sm">Rejeitar</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================ SAQUES ============================ */
function SaquesTab() {
  const [lista, setLista] = useState<any[]>([]);
  const [motivo, setMotivo] = useState<Record<string, string>>({});

  async function carregar() {
    const { data } = await supabase
      .from("solicitacoes_saque")
      .select("id, tipo, valor, chave_pix, solicitado_em, profiles!inner(nome, telefone, foto_url)")
      .eq("status", "pendente")
      .order("solicitado_em", { ascending: false });
    setLista(data ?? []);
  }
  useEffect(() => { carregar(); }, []);

  async function aprovar(id: string) {
    const { error } = await supabase.rpc("admin_aprovar_saque", { _id: id });
    if (error) toast.error(error.message); else { toast.success("Aprovado"); carregar(); }
  }
  async function rejeitar(id: string, telefone?: string, nome?: string) {
    const obs = motivo[id]; if (!obs) { toast.error("Motivo obrigatório"); return; }
    const { error } = await supabase.from("solicitacoes_saque")
      .update({ status: "rejeitado", processado_em: new Date().toISOString(), observacao: obs }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    const link = whatsappLink(telefone, `Olá ${nome ?? ""}, sua solicitação de saque foi rejeitada. Motivo: ${obs}`);
    if (link) window.open(link, "_blank");
    toast.success("Rejeitado");
    carregar();
  }

  return (
    <div className="space-y-3">
      {lista.length === 0 && <p className="text-muted-foreground text-sm">Sem saques pendentes.</p>}
      {lista.map((r: any) => (
        <div key={r.id} className="rounded-xl bg-card p-3 space-y-2">
          <div className="flex items-center gap-2">
            {r.profiles.foto_url ? <img src={r.profiles.foto_url} className="w-9 h-9 rounded-full" /> : <div className="w-9 h-9 rounded-full bg-white/10" />}
            <div className="flex-1">
              <div className="font-bold">{r.profiles.nome}</div>
              <div className="text-xs text-muted-foreground">{formatBRL(Number(r.valor))} • {r.tipo}</div>
              {r.chave_pix && <div className="text-[10px] text-muted-foreground">Pix: {r.chave_pix}</div>}
            </div>
          </div>
          <input value={motivo[r.id] ?? ""} onChange={(e)=>setMotivo(s=>({...s,[r.id]:e.target.value}))} placeholder="Motivo (se rejeitar)" className="w-full bg-white/10 rounded px-2 py-1 text-xs" />
          <div className="flex gap-2">
            <button onClick={()=>aprovar(r.id)} className="flex-1 bg-green-500 text-black font-bold py-1 rounded text-sm">Aprovar</button>
            <button onClick={()=>rejeitar(r.id, r.profiles.telefone, r.profiles.nome)} className="flex-1 bg-red-500 text-foreground py-1 rounded text-sm">Rejeitar</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================ SORTEIOS ============================ */
function SorteiosTab() {
  const [lista, setLista] = useState<any[]>([]);
  const [form, setForm] = useState({ mes: new Date().toISOString().slice(0,7)+"-01", tipo: "combustivel", descricao: "", parceiro: "", valor_premio: 0 });
  const [elegiveis, setElegiveis] = useState(0);

  async function carregar() {
    const { data } = await supabase.from("sorteios_mensais").select("*, profiles:ganhador_id(nome, telefone)").order("mes", { ascending: false });
    setLista(data ?? []);
    const { count } = await supabase.from("mototaxistas").select("id", { count: "exact", head: true }).eq("mensalidade_ativa", true);
    setElegiveis(count ?? 0);
  }
  useEffect(() => { carregar(); }, []);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("sorteios_mensais").insert({ ...form, tipo: form.tipo as any, status: "aberto" });
    if (error) toast.error(error.message); else { toast.success("Prêmio cadastrado"); carregar(); }
  }
  async function sortear(id: string) {
    const { data: cands } = await supabase.from("mototaxistas").select("id, profiles!inner(nome, telefone)").eq("mensalidade_ativa", true);
    if (!cands || cands.length === 0) { toast.error("Sem candidatos"); return; }
    const winner = cands[Math.floor(Math.random() * cands.length)];
    const { error } = await supabase.from("sorteios_mensais").update({ ganhador_id: winner.id, sorteado_em: new Date().toISOString(), status: "sorteado" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    const sorteio = lista.find(s => s.id === id);
    const p: any = winner.profiles;
    const link = whatsappLink(p.telefone, `Parabéns ${p.nome}! Você ganhou ${sorteio?.descricao} no sorteio InterGO de ${sorteio?.mes?.slice(0,7)}! Entre em contato para retirar seu prêmio.`);
    if (link) window.open(link, "_blank");
    carregar();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card p-3 text-sm"><EmojiIcon e="🎯" /> Mototaxistas elegíveis: <b>{elegiveis}</b></div>
      <form onSubmit={cadastrar} className="rounded-xl bg-card p-3 space-y-2">
        <h3 className="font-bold">Cadastrar prêmio</h3>
        <input type="date" value={form.mes} onChange={(e)=>setForm({...form, mes:e.target.value})} className="w-full bg-white/10 px-2 py-2 rounded" />
        <select value={form.tipo} onChange={(e)=>setForm({...form, tipo:e.target.value})} className="w-full bg-white/10 px-2 py-2 rounded">
          <option value="combustivel"><EmojiIcon e="⛽" /> Combustível</option>
          <option value="pecas"><EmojiIcon e="🔧" /> Peças</option>
          <option value="oleo"><EmojiIcon e="🛢️" /> Óleo</option>
          <option value="outros"><EmojiIcon e="🎁" /> Outros</option>
        </select>
        <input value={form.descricao} onChange={(e)=>setForm({...form, descricao:e.target.value})} placeholder="Descrição" required className="w-full bg-white/10 px-2 py-2 rounded" />
        <input value={form.parceiro} onChange={(e)=>setForm({...form, parceiro:e.target.value})} placeholder="Parceiro" className="w-full bg-white/10 px-2 py-2 rounded" />
        <input type="number" step="0.01" value={form.valor_premio} onChange={(e)=>setForm({...form, valor_premio: Number(e.target.value)})} placeholder="Valor" className="w-full bg-white/10 px-2 py-2 rounded" />
        <button type="submit" className="btn-cta w-full">Cadastrar</button>
      </form>
      <div className="space-y-2">
        {lista.map((s) => (
          <div key={s.id} className="rounded-xl bg-card p-3 text-sm">
            <div className="flex justify-between">
              <div>
                <div className="font-bold">{s.mes?.slice(0,7)} • {s.descricao}</div>
                <div className="text-xs text-muted-foreground">{s.tipo} • {s.parceiro ?? "—"} • {formatBRL(Number(s.valor_premio))}</div>
                {s.profiles && <div className="text-xs mt-1"><EmojiIcon e="🏆" /> {s.profiles.nome} ({formatarTelefone(s.profiles.telefone)})</div>}
              </div>
              <button onClick={()=>sortear(s.id)} className="bg-neon text-neon-foreground font-bold text-xs px-2 py-1 rounded h-fit">
                {s.ganhador_id ? "Resortear" : "Sortear"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ PARCEIROS ============================ */
function ParceirosTab() {
  const [lista, setLista] = useState<any[]>([]);
  const [form, setForm] = useState({ nome: "", tipo: "posto", descricao: "", cupom: "", desconto_percentual: 10 });

  async function carregar() {
    const { data } = await supabase.from("parceiros").select("*").order("criado_em", { ascending: false });
    setLista(data ?? []);
  }
  useEffect(() => { carregar(); }, []);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("parceiros").insert({ ...form, tipo: form.tipo as any });
    if (error) toast.error(error.message); else { toast.success("Parceiro adicionado"); setForm({ nome:"", tipo:"posto", descricao:"", cupom:"", desconto_percentual:10 }); carregar(); }
  }
  async function toggle(id: string, ativo: boolean) {
    await supabase.from("parceiros").update({ ativo: !ativo }).eq("id", id);
    carregar();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={cadastrar} className="rounded-xl bg-card p-3 space-y-2">
        <h3 className="font-bold">Novo parceiro</h3>
        <input required value={form.nome} onChange={(e)=>setForm({...form, nome:e.target.value})} placeholder="Nome" className="w-full bg-white/10 px-2 py-2 rounded" />
        <select value={form.tipo} onChange={(e)=>setForm({...form, tipo:e.target.value})} className="w-full bg-white/10 px-2 py-2 rounded">
          <option value="posto"><EmojiIcon e="⛽" /> Posto</option>
          <option value="pecas"><EmojiIcon e="🔧" /> Peças</option>
          <option value="outro"><EmojiIcon e="🎯" /> Outro</option>
        </select>
        <input value={form.descricao} onChange={(e)=>setForm({...form, descricao:e.target.value})} placeholder="Descrição" className="w-full bg-white/10 px-2 py-2 rounded" />
        <input value={form.cupom} onChange={(e)=>setForm({...form, cupom:e.target.value})} placeholder="Cupom" className="w-full bg-white/10 px-2 py-2 rounded" />
        <input type="number" value={form.desconto_percentual} onChange={(e)=>setForm({...form, desconto_percentual:Number(e.target.value)})} placeholder="Desconto %" className="w-full bg-white/10 px-2 py-2 rounded" />
        <button type="submit" className="btn-cta w-full">Adicionar</button>
      </form>
      {lista.map((p) => (
        <div key={p.id} className="rounded-xl bg-card p-3 flex justify-between items-center">
          <div>
            <div className="font-bold">{p.nome}</div>
            <div className="text-xs text-muted-foreground">{p.tipo} • {p.cupom} • {p.desconto_percentual}%</div>
          </div>
          <button onClick={()=>toggle(p.id, p.ativo)} className={`text-xs px-2 py-1 rounded ${p.ativo?"bg-green-500 text-black":"bg-white/20"}`}>
            {p.ativo ? "Ativo" : "Inativo"}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ============================ CORRIDAS ============================ */
function CorridasTab() {
  const [lista, setLista] = useState<any[]>([]);
  const [statusF, setStatusF] = useState<string>("todos");

  async function carregar() {
    let q = supabase.from("corridas").select("id, status, valor_estimado, valor_final, criado_em, origem_endereco, destino_endereco, passageiro:passageiro_id(nome), mototaxista:mototaxista_id(nome)").order("criado_em", { ascending: false }).limit(100);
    if (statusF !== "todos") q = q.eq("status", statusF as any);
    const { data } = await q;
    setLista(data ?? []);
  }
  useEffect(() => { carregar(); }, [statusF]);

  const cor: Record<string, string> = {
    aguardando: "bg-yellow-500", aceita: "bg-blue-500", em_andamento: "bg-purple-500", concluida: "bg-green-500", cancelada: "bg-red-500",
  };

  return (
    <div className="space-y-3">
      <select value={statusF} onChange={(e)=>setStatusF(e.target.value)} className="bg-white/10 px-3 py-2 rounded">
        <option value="todos">Todos</option>
        <option value="aguardando">Aguardando</option>
        <option value="aceita">Aceita</option>
        <option value="em_andamento">Em andamento</option>
        <option value="concluida">Concluída</option>
        <option value="cancelada">Cancelada</option>
      </select>
      {lista.map((c: any) => (
        <div key={c.id} className="rounded-xl bg-card p-3 text-sm">
          <div className="flex justify-between">
            <div className="truncate flex-1">
              <div className="font-bold truncate">{c.passageiro?.nome ?? "—"} → {c.mototaxista?.nome ?? "—"}</div>
              <div className="text-xs text-muted-foreground truncate">{c.origem_endereco} → {c.destino_endereco}</div>
              <div className="text-[10px] text-muted-foreground">{new Date(c.criado_em).toLocaleString("pt-BR")} • {formatBRL(Number(c.valor_final ?? c.valor_estimado))}</div>
            </div>
            <span className={`text-[10px] px-2 py-1 rounded h-fit text-black font-bold ${cor[c.status] ?? "bg-white/20"}`}>{c.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================ CONFIG ============================ */
function ConfigTab() {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [carteiraAtiva, setCarteiraAtiva] = useState(false);
  const [confirmandoDesativar, setConfirmandoDesativar] = useState(false);

  async function carregar() {
    const { data } = await supabase.from("configuracoes_plataforma").select("chave, valor");
    const map: Record<string, string> = {};
    (data ?? []).forEach((r) => { map[r.chave] = r.valor; });
    setVals(map);
    setCarteiraAtiva(map.carteira_ativa === "true");
  }
  useEffect(() => { carregar(); }, []);

  async function salvarChave(chave: string, valor: string) {
    const { error } = await supabase.from("configuracoes_plataforma").update({ valor }).eq("chave", chave);
    if (error) toast.error(error.message); else toast.success("Salvo");
  }

  async function toggleCarteira(novo: boolean) {
    if (!novo && carteiraAtiva && !confirmandoDesativar) { setConfirmandoDesativar(true); return; }
    await salvarChave("carteira_ativa", novo ? "true" : "false");
    setCarteiraAtiva(novo);
    setConfirmandoDesativar(false);
  }

  const campos = [
    { chave: "saldo_minimo_recarga", label: "Mínimo recarga (R$)" },
    { chave: "saldo_minimo_saque", label: "Mínimo saque (R$)" },
    { chave: "valor_minimo_corrida", label: "Tarifa mínima (R$)" },
    { chave: "preco_por_km", label: "Preço por km (R$)" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold"><EmojiIcon e="💳" /> Carteira Digital</div>
            <div className="text-xs text-muted-foreground">{carteiraAtiva ? "Ativada" : "Desativada"}</div>
          </div>
          <button onClick={() => toggleCarteira(!carteiraAtiva)} className={`px-4 py-2 rounded font-bold ${carteiraAtiva?"bg-red-500 text-foreground":"bg-green-500 text-black"}`}>
            {carteiraAtiva ? "Desativar" : "Ativar"}
          </button>
        </div>
        {confirmandoDesativar && (
          <div className="mt-3 p-3 bg-yellow-500/20 rounded text-xs space-y-2">
            <p>Saldos existentes são preservados. Novas recargas e pagamentos via app serão bloqueados. Confirmar?</p>
            <div className="flex gap-2">
              <button onClick={()=>toggleCarteira(false)} className="bg-red-500 text-foreground px-3 py-1 rounded">Confirmar</button>
              <button onClick={()=>setConfirmandoDesativar(false)} className="bg-white/20 px-3 py-1 rounded">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {campos.map((c) => (
        <div key={c.chave} className="rounded-xl bg-card p-3 space-y-2">
          <label className="text-xs text-muted-foreground">{c.label}</label>
          <div className="flex gap-2">
            <input value={vals[c.chave] ?? ""} onChange={(e)=>setVals({...vals,[c.chave]:e.target.value})} className="flex-1 bg-white/10 px-3 py-2 rounded" />
            <button onClick={()=>salvarChave(c.chave, vals[c.chave] ?? "")} className="btn-cta text-sm px-4">Salvar</button>
          </div>
        </div>
      ))}
    </div>
  );
}
function CidadesTab() {
  const db = supabase as any;
  const [cidades, setCidades] = useState<any[]>([]);
  const [sel, setSel] = useState<any | null>(null);
  const [openAdd, setOpenAdd] = useState(false);

  async function load() {
    const { data } = await db.from("cidades_configuradas").select("*").order("estado").order("cidade");
    setCidades(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function toggleAtiva(c: any) {
    await db.from("cidades_configuradas").update({ ativa: !c.ativa }).eq("id", c.id);
    toast.success(c.ativa ? "Desativada" : "Ativada");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold"><EmojiIcon e="🏙️" /> Cidades configuradas</h2>
        <button onClick={() => setOpenAdd(true)} className="btn-cta text-sm">+ Adicionar cidade</button>
      </div>
      {cidades.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma cidade configurada.</p>}
      <div className="space-y-2">
        {cidades.map((c) => (
          <div key={c.id} className={`rounded-xl bg-card p-3 flex items-center justify-between cursor-pointer ${sel?.id === c.id ? "ring-2 ring-[color:var(--color-neon)]" : ""}`} onClick={() => setSel(c)}>
            <div>
              <div className="font-bold">{c.cidade} <span className="text-xs text-muted-foreground">— {c.estado}</span></div>
              <div className="text-xs text-muted-foreground">{c.ativa ? "Ativa" : "Inativa"}</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); toggleAtiva(c); }} className={`text-xs px-3 py-1 rounded ${c.ativa ? "bg-red-500 text-foreground" : "bg-green-500 text-black font-bold"}`}>
              {c.ativa ? "Desativar" : "Ativar"}
            </button>
          </div>
        ))}
      </div>

      {openAdd && <AddCidadeModal onClose={() => setOpenAdd(false)} onAdded={() => { setOpenAdd(false); load(); }} />}
      {sel && <TarifasSection cidade={sel} />}
      {sel && <BairrosSection cidade={sel} />}
      {sel && <SimuladorSection cidade={sel} />}
    </div>
  );
}

function AddCidadeModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [loc, setLoc] = useState({ estado: "", cidade: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!loc.estado || !loc.cidade) return toast.error("Selecione estado e cidade");
    setSaving(true);
    const { error } = await (supabase as any).from("cidades_configuradas").insert({ estado: loc.estado, cidade: loc.cidade });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Cidade adicionada");
    onAdded();
  }

  return (
    <div className="fixed inset-0 bg-background/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card-mz p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Nova cidade</h3>
        <LocationPicker value={loc} onChange={setLoc} />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-outline-neon flex-1">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn-cta flex-1">{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

function TarifasSection({ cidade }: { cidade: any }) {
  const db = supabase as any;
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [form, setForm] = useState({ nome: "", hora_inicio: "07:00", hora_fim: "21:00", valor: 5 });

  async function load() {
    const { data } = await db.from("tarifas_horario").select("*").eq("cidade_id", cidade.id).order("hora_inicio");
    setTarifas(data ?? []);
  }
  useEffect(() => { load(); }, [cidade.id]);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome) return toast.error("Informe o nome");
    const { error } = await db.from("tarifas_horario").insert({ ...form, cidade_id: cidade.id, valor: Number(form.valor) });
    if (error) return toast.error(error.message);
    toast.success("Tarifa adicionada");
    setForm({ nome: "", hora_inicio: "07:00", hora_fim: "21:00", valor: 5 });
    load();
  }
  async function toggle(id: string, ativo: boolean) { await db.from("tarifas_horario").update({ ativo: !ativo }).eq("id", id); load(); }
  async function remover(id: string) { await db.from("tarifas_horario").delete().eq("id", id); load(); }

  // Lacunas/sobreposições simples (sem cruzar meia-noite no check)
  const avisos = useMemo(() => {
    const ativas = tarifas.filter((t) => t.ativo).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    const out: string[] = [];
    for (let i = 1; i < ativas.length; i++) {
      const prev = ativas[i - 1], cur = ativas[i];
      if (cur.hora_inicio < prev.hora_fim) out.push(`Sobreposição entre ${prev.nome} e ${cur.nome}`);
      else if (cur.hora_inicio > prev.hora_fim) out.push(`Sem tarifa entre ${prev.hora_fim.slice(0,5)} e ${cur.hora_inicio.slice(0,5)}`);
    }
    return out;
  }, [tarifas]);

  return (
    <div className="card-mz p-4 space-y-3">
      <h3 className="font-bold">⏰ Tarifas por horário — {cidade.cidade}</h3>
      {avisos.map((a, i) => <div key={i} className="text-xs text-yellow-400">{a}</div>)}
      <div className="space-y-2">
        {tarifas.map((t) => (
          <div key={t.id} className="flex items-center justify-between bg-background/30 rounded p-2 text-sm">
            <div>
              <div className="font-bold">{t.nome}</div>
              <div className="text-xs text-muted-foreground">{t.hora_inicio.slice(0,5)} – {t.hora_fim.slice(0,5)} • {formatBRL(Number(t.valor))}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggle(t.id, t.ativo)} className={`text-[10px] px-2 py-1 rounded ${t.ativo ? "bg-green-500 text-black font-bold" : "bg-white/20"}`}>{t.ativo ? "Ativa" : "Inativa"}</button>
              <button onClick={() => remover(t.id)} className="text-[10px] px-2 py-1 rounded bg-red-500/40">×</button>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={adicionar} className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
        <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome (ex: Diurno)" className="bg-white/10 rounded px-2 py-1 text-sm col-span-2" />
        <input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} className="bg-white/10 rounded px-2 py-1 text-sm" />
        <input type="time" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} className="bg-white/10 rounded px-2 py-1 text-sm" />
        <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} placeholder="R$" className="bg-white/10 rounded px-2 py-1 text-sm col-span-2" />
        <button className="btn-cta col-span-2 text-sm">+ Adicionar faixa</button>
      </form>
    </div>
  );
}

function BairrosSection({ cidade }: { cidade: any }) {
  const db = supabase as any;
  const [lista, setLista] = useState<any[]>([]);
  const [form, setForm] = useState({ nome_bairro: "", valor_adicional: 4 });

  async function load() {
    const { data } = await db.from("bairros_adicional").select("*").eq("cidade_id", cidade.id).order("nome_bairro");
    setLista(data ?? []);
  }
  useEffect(() => { load(); }, [cidade.id]);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome_bairro) return;
    const { error } = await db.from("bairros_adicional").insert({ ...form, valor_adicional: Number(form.valor_adicional), cidade_id: cidade.id });
    if (error) return toast.error(error.message);
    setForm({ nome_bairro: "", valor_adicional: 4 });
    load();
  }
  async function toggle(id: string, ativo: boolean) { await db.from("bairros_adicional").update({ ativo: !ativo }).eq("id", id); load(); }
  async function remover(id: string) { await db.from("bairros_adicional").delete().eq("id", id); load(); }

  return (
    <div className="card-mz p-4 space-y-3">
      <h3 className="font-bold"><EmojiIcon e="🏘️" /> Bairros com adicional — {cidade.cidade}</h3>
      <div className="text-xs text-muted-foreground">Bairros sem adicional não precisam ser cadastrados.</div>
      <div className="space-y-2">
        {lista.map((b) => (
          <div key={b.id} className="flex items-center justify-between bg-background/30 rounded p-2 text-sm">
            <div>
              <div className="font-bold">{b.nome_bairro}</div>
              <div className="text-xs text-muted-foreground">+{formatBRL(Number(b.valor_adicional))}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggle(b.id, b.ativo)} className={`text-[10px] px-2 py-1 rounded ${b.ativo ? "bg-green-500 text-black font-bold" : "bg-white/20"}`}>{b.ativo ? "Ativo" : "Inativo"}</button>
              <button onClick={() => remover(b.id)} className="text-[10px] px-2 py-1 rounded bg-red-500/40">×</button>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={adicionar} className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
        <input value={form.nome_bairro} onChange={(e) => setForm({ ...form, nome_bairro: e.target.value })} placeholder="Nome do bairro" className="bg-white/10 rounded px-2 py-1 text-sm col-span-2" />
        <input type="number" step="0.01" value={form.valor_adicional} onChange={(e) => setForm({ ...form, valor_adicional: Number(e.target.value) })} placeholder="R$" className="bg-white/10 rounded px-2 py-1 text-sm" />
        <button className="btn-cta col-span-3 text-sm">+ Adicionar bairro</button>
      </form>
    </div>
  );
}

function SimuladorSection({ cidade }: { cidade: any }) {
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [resultado, setResultado] = useState<any>(null);

  async function simular() {
    const { data } = await (supabase as any).rpc("calcular_valor_corrida", {
      _cidade_id: cidade.id,
      _bairro_origem: origem || null,
      _bairro_destino: destino || null,
    });
    setResultado(data?.[0] ?? null);
  }
  useEffect(() => { simular(); }, [origem, destino, cidade.id]);

  return (
    <div className="card-mz p-4 space-y-3">
      <h3 className="font-bold"><EmojiIcon e="🧮" /> Simulador — agora em {cidade.cidade}</h3>
      <div className="grid grid-cols-2 gap-2">
        <input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Bairro origem" className="bg-white/10 rounded px-2 py-1 text-sm" />
        <input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Bairro destino" className="bg-white/10 rounded px-2 py-1 text-sm" />
      </div>
      {resultado && resultado.tarifa_id ? (
        <div className="text-sm space-y-1">
          <div>Tarifa: <strong>{resultado.tarifa_nome}</strong> — {formatBRL(Number(resultado.tarifa_valor))}</div>
          {Number(resultado.adicional) > 0 && <div>Adicional: +{formatBRL(Number(resultado.adicional))}</div>}
          <div className="text-lg font-bold" style={{ color: "var(--color-neon)" }}>
            Total: {formatBRL(Number(resultado.total))}
          </div>
        </div>
      ) : (
        <div className="text-yellow-400 text-sm">Nenhuma tarifa ativa neste horário.</div>
      )}
    </div>
  );
}
