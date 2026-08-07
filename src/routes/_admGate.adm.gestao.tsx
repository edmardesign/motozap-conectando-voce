import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getMeuContextoAdmin,
  listarCidades,
  listarPerfisAdmin,
  listarAuditoria,
  buscarUsuarioPorTelefone,
  criarUsuarioAdministrativo,
  gerarCodigoAtivacao,
  criarSubadmin,
  criarEmbaixador,
  atualizarPermissao,
  atualizarCidadesSubadmin,
  transferirEmbaixador,
  suspenderPerfilAdmin,
  removerFuncaoAdmin,
  contagensCidade,
  cidadeCriar,
  cidadeEditar,
  cidadeAtivar,
  cidadeSuspender,
  cidadeDefinirServicos,
} from "@/lib/admin-hier.functions";
import { CidadeModal, type CidadeModalMode } from "@/components/cidade-modal";
import { maskPhone, onlyDigits } from "@/lib/phone";

export const Route = createFileRoute("/_admGate/adm/gestao")({
  head: () => ({
    meta: [
      { title: "Bora Zé! • Gestão hierárquica" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GestaoPage,
});

/* ================= Permissões: agrupamento + descrições ================= */
type Perm = { codigo: string; label: string; desc: string };
const GRUPOS: { titulo: string; perms: Perm[] }[] = [
  {
    titulo: "Usuários",
    perms: [
      { codigo: "visualizar_passageiros", label: "Visualizar passageiros", desc: "Ver lista e dados de passageiros." },
      { codigo: "administrar_passageiros", label: "Administrar passageiros", desc: "Editar dados e bloquear passageiros." },
      { codigo: "visualizar_mototaxistas", label: "Visualizar mototaxistas", desc: "Ver lista e dados de mototaxistas." },
      { codigo: "administrar_mototaxistas", label: "Administrar mototaxistas", desc: "Editar dados e bloquear mototaxistas." },
      { codigo: "aprovar_mototaxistas", label: "Aprovar mototaxistas", desc: "Aprovar cadastros pendentes e pagamentos." },
    ],
  },
  {
    titulo: "Operação",
    perms: [
      { codigo: "visualizar_corridas", label: "Visualizar corridas", desc: "Ver corridas em tempo real e histórico." },
      { codigo: "administrar_corridas", label: "Administrar corridas", desc: "Intervir, cancelar e ajustar corridas." },
      { codigo: "administrar_suporte", label: "Administrar suporte", desc: "Atender chamados e reclamações." },
    ],
  },
  {
    titulo: "Financeiro",
    perms: [
      { codigo: "visualizar_pagamentos", label: "Visualizar pagamentos", desc: "Ver mensalidades, saques e recargas." },
      { codigo: "administrar_pagamentos", label: "Administrar pagamentos", desc: "Aprovar saques e mensalidades." },
    ],
  },
  {
    titulo: "Gestão",
    perms: [
      { codigo: "cadastrar_cidades", label: "Cadastrar cidades", desc: "Criar e ativar cidades." },
      { codigo: "administrar_embaixadores", label: "Administrar embaixadores", desc: "Nomear e transferir embaixadores." },
      { codigo: "alterar_configuracoes", label: "Alterar configurações", desc: "Alterar configurações da plataforma." },
      { codigo: "visualizar_relatorios", label: "Visualizar relatórios", desc: "Acessar relatórios consolidados." },
    ],
  },
];
const PERMS_FLAT: Record<string, Perm> = Object.fromEntries(
  GRUPOS.flatMap((g) => g.perms.map((p) => [p.codigo, p])),
);
const PARES_VIS_ADM: Record<string, string> = {
  administrar_passageiros: "visualizar_passageiros",
  administrar_mototaxistas: "visualizar_mototaxistas",
  administrar_corridas: "visualizar_corridas",
  administrar_pagamentos: "visualizar_pagamentos",
};

/* ================= Tipos ================= */
type Ctx = {
  user_id: string;
  is_principal: boolean;
  nivel: "admin_principal" | "subadmin" | "embaixador" | null;
  cidades: { id: string; cidade: string; estado: string; ativa: boolean }[];
};
type Cidade = { id: string; cidade: string; estado: string; ativa: boolean; criado_em: string; mototaxi_ativo: boolean };
type PerfilRow = {
  id: string;
  user_id: string;
  nivel: "admin_principal" | "subadmin" | "embaixador";
  ativo: boolean;
  suspenso: boolean;
  todas_cidades: boolean;
  observacao: string | null;
  criado_em: string;
  profile: { id: string; nome: string; telefone: string; tipo: string; ativo: boolean } | null;
  cidades: { id: string; cidade: string; estado: string; ativa: boolean }[];
  permissoes: string[];
};

type Tab = "subadmins" | "embaixadores" | "cidades" | "auditoria";

/* ================= Página principal ================= */
function GestaoPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [tab, setTab] = useState<Tab>("subadmins");
  const [cidadeSel, setCidadeSel] = useState<string>("todas");
  const fetchCtx = useServerFn(getMeuContextoAdmin);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      if (!sess.user) {
        navigate({ to: "/admin" });
        return;
      }
      try {
        const c = await fetchCtx();
        if (!c.nivel) {
          toast.error("Acesso negado — sem função administrativa.");
          navigate({ to: "/admin" });
          return;
        }
        setCtx(c);
      } catch (e) {
        toast.error((e as Error).message);
        navigate({ to: "/admin" });
      } finally {
        setChecking(false);
      }
    })();
  }, [navigate, fetchCtx]);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-white">Carregando…</div>;
  }
  if (!ctx) return null;

  // Embaixador: força cidade única, sem seletor visível.
  const embaixadorLock =
    ctx.nivel === "embaixador" && ctx.cidades.length > 0 ? ctx.cidades[0].id : null;
  const cidadeAtual = embaixadorLock ?? (cidadeSel === "todas" ? null : cidadeSel);

  const podeVerAdminStuff = ctx.is_principal;

  return (
    <main className="min-h-screen bg-background text-white">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Bora Zé! • Gestão</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wider">
            {ctx.nivel?.replace("_", " ")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {ctx.nivel !== "embaixador" && (
            <select
              value={cidadeSel}
              onChange={(e) => setCidadeSel(e.target.value)}
              className="rounded-lg bg-white/10 border border-white/10 px-2 py-1 text-sm outline-none"
              aria-label="Selecionar cidade"
            >
              <option value="todas">Todas as cidades</option>
              {ctx.cidades.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cidade} — {c.estado}
                </option>
              ))}
            </select>
          )}
          <Link to="/admin" className="text-xs text-white/70 hover:text-white">
            Painel operacional
          </Link>
          <button
            onClick={async () => {
              try { await supabase.auth.signOut(); } catch { /* ignore */ }
              navigate({ to: "/admin", replace: true });
            }}
            className="text-xs text-white/70 hover:text-white underline"
          >
            Sair
          </button>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-white/10">
        {podeVerAdminStuff && (
          <TabBtn active={tab === "subadmins"} onClick={() => setTab("subadmins")}>
            Subadministradores
          </TabBtn>
        )}
        {podeVerAdminStuff && (
          <TabBtn active={tab === "embaixadores"} onClick={() => setTab("embaixadores")}>
            Embaixadores
          </TabBtn>
        )}
        {podeVerAdminStuff && (
          <TabBtn active={tab === "cidades"} onClick={() => setTab("cidades")}>
            Cidades
          </TabBtn>
        )}
        <TabBtn active={tab === "auditoria"} onClick={() => setTab("auditoria")}>
          Histórico
        </TabBtn>
        <a href="/adm/precos" className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm bg-white/10 text-white/80 hover:bg-white/20">
          Preços e tarifas
        </a>
      </nav>

      <section className="px-4 py-5 space-y-4 max-w-5xl mx-auto">
        <IndicadoresCidade cidadeId={cidadeAtual} />
        {tab === "subadmins" && podeVerAdminStuff && <SubadminsTab ctx={ctx} />}
        {tab === "embaixadores" && podeVerAdminStuff && <EmbaixadoresTab ctx={ctx} />}
        {tab === "cidades" && podeVerAdminStuff && <CidadesTab />}
        {tab === "auditoria" && <AuditoriaTab cidadeId={cidadeAtual} />}
      </section>
    </main>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${
        active ? "bg-neon text-neon-foreground font-bold" : "bg-white/10 text-white/80"
      }`}
    >
      {children}
    </button>
  );
}

/* ================= Indicadores por cidade ================= */
function IndicadoresCidade({ cidadeId }: { cidadeId: string | null }) {
  const fetchContagens = useServerFn(contagensCidade);
  const [c, setC] = useState<{ passageiros: number; mototaxistas: number; corridas: number } | null>(null);
  useEffect(() => {
    fetchContagens({ data: { cidade_id: cidadeId } })
      .then(setC)
      .catch((e) => toast.error((e as Error).message));
  }, [cidadeId, fetchContagens]);
  if (!c) return null;
  const cards = [
    { label: "Passageiros", value: c.passageiros },
    { label: "Mototaxistas", value: c.mototaxistas },
    { label: "Corridas", value: c.corridas },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {cards.map((k) => (
        <div key={k.label} className="rounded-xl bg-card p-3 border border-white/10">
          <div className="text-[11px] text-white/60 uppercase tracking-wider">{k.label}</div>
          <div className="text-2xl font-bold">{k.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ================= Subadministradores ================= */
function SubadminsTab({ ctx }: { ctx: Ctx }) {
  const [rows, setRows] = useState<PerfilRow[] | null>(null);
  const [wizard, setWizard] = useState(false);
  const fetchPerfis = useServerFn(listarPerfisAdmin);

  async function refresh() {
    try {
      const data = (await fetchPerfis()) as PerfilRow[];
      setRows(data.filter((r) => r.nivel === "subadmin"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Subadministradores</h2>
        <button className="btn-cta" onClick={() => setWizard(true)}>Adicionar subadministrador</button>
      </div>
      {rows === null && <div className="text-white/60">Carregando…</div>}
      {rows && rows.length === 0 && (
        <div className="rounded-xl bg-card border border-white/10 p-6 text-center text-white/60">
          Nenhum subadministrador cadastrado.
        </div>
      )}
      <div className="space-y-2">
        {rows?.map((r) => (
          <PerfilCard key={r.id} row={r} ctx={ctx} onChanged={refresh} tipoLabel="Subadmin" />
        ))}
      </div>
      {wizard && (
        <SubadminWizard
          onClose={() => setWizard(false)}
          onDone={() => { setWizard(false); refresh(); }}
        />
      )}
    </div>
  );
}

/* ================= Embaixadores ================= */
function EmbaixadoresTab({ ctx }: { ctx: Ctx }) {
  const [rows, setRows] = useState<PerfilRow[] | null>(null);
  const [wizard, setWizard] = useState(false);
  const fetchPerfis = useServerFn(listarPerfisAdmin);

  async function refresh() {
    try {
      const data = (await fetchPerfis()) as PerfilRow[];
      setRows(data.filter((r) => r.nivel === "embaixador"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Embaixadores</h2>
        <button className="btn-cta" onClick={() => setWizard(true)}>Adicionar embaixador</button>
      </div>
      {rows === null && <div className="text-white/60">Carregando…</div>}
      {rows && rows.length === 0 && (
        <div className="rounded-xl bg-card border border-white/10 p-6 text-center text-white/60">
          Nenhum embaixador cadastrado.
        </div>
      )}
      <div className="space-y-2">
        {rows?.map((r) => (
          <PerfilCard key={r.id} row={r} ctx={ctx} onChanged={refresh} tipoLabel="Embaixador" />
        ))}
      </div>
      {wizard && (
        <EmbaixadorWizard
          onClose={() => setWizard(false)}
          onDone={() => { setWizard(false); refresh(); }}
        />
      )}
    </div>
  );
}

/* ================= Card de perfil (ações) ================= */
function PerfilCard({
  row, ctx, onChanged, tipoLabel,
}: { row: PerfilRow; ctx: Ctx; onChanged: () => void; tipoLabel: string }) {
  const [aberto, setAberto] = useState(false);
  const fetchCidades = useServerFn(listarCidades);
  const setPerm = useServerFn(atualizarPermissao);
  const setCidades = useServerFn(atualizarCidadesSubadmin);
  const transferir = useServerFn(transferirEmbaixador);
  const suspender = useServerFn(suspenderPerfilAdmin);
  const remover = useServerFn(removerFuncaoAdmin);
  const [cidadesDb, setCidadesDb] = useState<Cidade[] | null>(null);
  const [modalTransferir, setModalTransferir] = useState(false);

  useEffect(() => {
    if (aberto && !cidadesDb) fetchCidades().then(setCidadesDb).catch((e) => toast.error((e as Error).message));
  }, [aberto, cidadesDb, fetchCidades]);

  const isSelf = row.user_id === ctx.user_id;
  const podeGerir = ctx.is_principal && !isSelf && row.nivel !== "admin_principal";

  async function togglePerm(codigo: string, permitido: boolean) {
    try {
      await setPerm({ data: { perfil_id: row.id, codigo, permitido } });
      if (permitido && PARES_VIS_ADM[codigo]) {
        await setPerm({ data: { perfil_id: row.id, codigo: PARES_VIS_ADM[codigo], permitido: true } });
      }
      toast.success("Permissão atualizada");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function toggleCidade(cidadeId: string) {
    const setAtual = new Set(row.cidades.map((c) => c.id));
    if (setAtual.has(cidadeId)) setAtual.delete(cidadeId); else setAtual.add(cidadeId);
    try {
      await setCidades({ data: { perfil_id: row.id, cidade_ids: Array.from(setAtual) } });
      toast.success("Cidades atualizadas");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function acaoTransferirCidade(v: { cidade_id?: string } | { cidade: string; estado: string }) {
    if (!("cidade_id" in v) || !v.cidade_id) return;
    await transferir({ data: { perfil_id: row.id, nova_cidade_id: v.cidade_id } });
    toast.success("Embaixador transferido");
    setModalTransferir(false);
    onChanged();
  }

  async function acaoSuspender(v: boolean) {
    if (!confirm(v ? "Suspender este perfil?" : "Reativar este perfil?")) return;
    try {
      await suspender({ data: { perfil_id: row.id, suspenso: v } });
      toast.success(v ? "Perfil suspenso" : "Perfil reativado");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function acaoRemover() {
    if (!confirm("Remover a função administrativa? A conta do usuário permanece ativa.")) return;
    try {
      await remover({ data: { perfil_id: row.id } });
      toast.success("Função removida");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="rounded-xl bg-card border border-white/10">
      <button className="w-full flex items-center justify-between p-3" onClick={() => setAberto((v) => !v)}>
        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold">{row.profile?.nome ?? "(sem nome)"}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">{tipoLabel}</span>
            {row.suspenso && <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/40">Suspenso</span>}
            {!row.ativo && <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">Removido</span>}
          </div>
          <div className="text-xs text-white/60">
            {row.profile?.telefone ? maskPhone(row.profile.telefone) : ""} • {new Date(row.criado_em).toLocaleDateString("pt-BR")}
          </div>
          <div className="text-xs text-white/50">
            {row.todas_cidades ? "Todas as cidades" : `${row.cidades.length} cidade(s)`} • {row.permissoes.length} permissão(ões)
          </div>
        </div>
        <span className="text-white/50">{aberto ? "▲" : "▼"}</span>
      </button>

      {aberto && (
        <div className="px-3 pb-3 space-y-4 border-t border-white/10 pt-3">
          {row.nivel === "subadmin" && cidadesDb && (
            <div>
              <div className="text-xs uppercase tracking-wider text-white/60 mb-2">Cidades vinculadas</div>
              {row.todas_cidades ? (
                <div className="text-sm text-white/70">Este subadmin tem acesso a todas as cidades.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {cidadesDb.map((c) => {
                    const ativo = row.cidades.some((x) => x.id === c.id);
                    return (
                      <label key={c.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm border ${ativo ? "bg-neon/10 border-neon/40" : "border-white/10 bg-white/5"}`}>
                        <input
                          type="checkbox"
                          checked={ativo}
                          disabled={!podeGerir}
                          onChange={() => toggleCidade(c.id)}
                        />
                        {c.cidade}/{c.estado}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {row.nivel === "embaixador" && (
            <div>
              <div className="text-xs uppercase tracking-wider text-white/60 mb-2">Cidade vinculada</div>
              <div className="text-sm">
                {row.cidades[0] ? `${row.cidades[0].cidade}/${row.cidades[0].estado}` : "—"}
              </div>
              {podeGerir && (
                <button onClick={() => setModalTransferir(true)} className="mt-2 text-xs underline text-white/80">
                  Transferir para outra cidade
                </button>
              )}
            </div>
          )}
          <CidadeModal
            open={modalTransferir}
            mode="transferir"
            cidades={(cidadesDb ?? []).filter((c) => c.ativa)}
            onCancel={() => setModalTransferir(false)}
            onConfirm={acaoTransferirCidade}
          />

          <PermissoesGrid
            selecionadas={new Set(row.permissoes)}
            disabled={!podeGerir}
            onChange={togglePerm}
          />

          {podeGerir && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              {!row.suspenso && <button className="rounded-lg px-3 py-2 bg-yellow-600 text-white text-sm" onClick={() => acaoSuspender(true)}>Suspender</button>}
              {row.suspenso && <button className="rounded-lg px-3 py-2 bg-green-600 text-white text-sm" onClick={() => acaoSuspender(false)}>Reativar</button>}
              <button className="rounded-lg px-3 py-2 bg-red-600 text-white text-sm" onClick={acaoRemover}>Remover função</button>
            </div>
          )}
          {isSelf && (
            <div className="text-xs text-white/60">Você não pode alterar o próprio perfil administrativo.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= Grid de permissões ================= */
function PermissoesGrid({
  selecionadas, disabled, onChange,
}: { selecionadas: Set<string>; disabled?: boolean; onChange: (codigo: string, permitido: boolean) => void }) {
  return (
    <div className="space-y-3">
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          <div className="text-xs uppercase tracking-wider text-white/60 mb-1">{g.titulo}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {g.perms.map((p) => {
              const on = selecionadas.has(p.codigo);
              return (
                <label key={p.codigo} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm border ${on ? "bg-neon/10 border-neon/40" : "border-white/10 bg-white/5"} ${disabled ? "opacity-60" : ""}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={disabled}
                    onChange={(e) => onChange(p.codigo, e.target.checked)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-semibold">{p.label}</div>
                    <div className="text-[11px] text-white/60">{p.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= Wizard: Subadmin ================= */
type EtapaSA = "usuario" | "cidades" | "permissoes" | "revisar";
function SubadminWizard({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [etapa, setEtapa] = useState<EtapaSA>("usuario");
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [foundNome, setFoundNome] = useState<string | null>(null);
  const [codigoAtivacao, setCodigoAtivacao] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [todasCidades, setTodasCidades] = useState(false);
  const [cidadeIds, setCidadeIds] = useState<Set<string>>(new Set());
  const [permissoes, setPermissoes] = useState<Set<string>>(new Set());
  const [cidades, setCidades] = useState<Cidade[] | null>(null);

  const buscar = useServerFn(buscarUsuarioPorTelefone);
  const criarUser = useServerFn(criarUsuarioAdministrativo);
  const gerarCod = useServerFn(gerarCodigoAtivacao);
  const criarSA = useServerFn(criarSubadmin);
  const fetchCidades = useServerFn(listarCidades);

  useEffect(() => {
    if (etapa === "cidades" && !cidades) fetchCidades().then(setCidades).catch((e) => toast.error((e as Error).message));
  }, [etapa, cidades, fetchCidades]);

  async function localizarOuCriar() {
    setBusy(true);
    try {
      const tel = onlyDigits(telefone);
      const u = await buscar({ data: { telefone: tel } });
      if (u) {
        setUserId(u.id); setFoundNome(u.nome); setCodigoAtivacao(null);
        toast.success(`Usuário encontrado: ${u.nome}`);
      } else {
        if (!nome.trim()) { toast.error("Informe o nome para criar o novo usuário."); return; }
        const r = await criarUser({ data: { telefone: tel, nome } });
        const ativ = await gerarCod({ data: { user_id: r.user_id } });
        setUserId(r.user_id); setFoundNome(nome); setCodigoAtivacao(ativ.codigo);
        toast.success("Usuário criado. Repasse o código de ativação.");
      }
      setEtapa("cidades");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function confirmar() {
    if (!userId) return;
    setBusy(true);
    try {
      await criarSA({
        data: {
          user_id: userId,
          todas_cidades: todasCidades,
          cidade_ids: Array.from(cidadeIds),
          permissoes: Array.from(permissoes),
        },
      });
      toast.success("Subadministrador cadastrado");
      onDone();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function togglePerm(cod: string, on: boolean) {
    setPermissoes((s) => {
      const n = new Set(s);
      if (on) { n.add(cod); if (PARES_VIS_ADM[cod]) n.add(PARES_VIS_ADM[cod]); }
      else n.delete(cod);
      return n;
    });
  }

  return (
    <Modal onClose={onClose} titulo={`Novo subadministrador — ${labelEtapa(etapa)}`}>
      {etapa === "usuario" && (
        <div className="space-y-3">
          <label className="block text-sm">Telefone
            <input
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2 outline-none"
            />
          </label>
          <label className="block text-sm">Nome (se for criar novo)
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2 outline-none"
            />
          </label>
          {codigoAtivacao && (
            <div className="rounded-lg bg-yellow-500/20 border border-yellow-500/40 p-3 text-sm">
              Código de ativação: <span className="font-mono font-bold">{codigoAtivacao}</span> —
              o usuário deve usá-lo em "Esqueci meu PIN" para definir sua senha. Só é exibido uma vez.
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button className="text-white/70 px-3 py-2" onClick={onClose}>Cancelar</button>
            <button className="btn-cta" onClick={localizarOuCriar} disabled={busy || onlyDigits(telefone).length !== 11}>
              {busy ? "…" : "Localizar / criar"}
            </button>
          </div>
        </div>
      )}
      {etapa === "cidades" && (
        <div className="space-y-3">
          <div className="text-sm">Usuário: <strong>{foundNome}</strong></div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={todasCidades} onChange={(e) => setTodasCidades(e.target.checked)} />
            Todas as cidades
          </label>
          {!todasCidades && cidades && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-auto">
              {cidades.filter((c) => c.ativa).map((c) => {
                const on = cidadeIds.has(c.id);
                return (
                  <label key={c.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm border ${on ? "bg-neon/10 border-neon/40" : "border-white/10 bg-white/5"}`}>
                    <input type="checkbox" checked={on} onChange={() => {
                      setCidadeIds((s) => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; });
                    }} />
                    {c.cidade}/{c.estado}
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex justify-between">
            <button className="text-white/70 px-3 py-2" onClick={() => setEtapa("usuario")}>Voltar</button>
            <button className="btn-cta" onClick={() => setEtapa("permissoes")} disabled={!todasCidades && cidadeIds.size === 0}>Próximo</button>
          </div>
        </div>
      )}
      {etapa === "permissoes" && (
        <div className="space-y-3">
          <PermissoesGrid selecionadas={permissoes} onChange={togglePerm} />
          <div className="flex justify-between">
            <button className="text-white/70 px-3 py-2" onClick={() => setEtapa("cidades")}>Voltar</button>
            <button className="btn-cta" onClick={() => setEtapa("revisar")}>Próximo</button>
          </div>
        </div>
      )}
      {etapa === "revisar" && (
        <div className="space-y-3 text-sm">
          <div><strong>Usuário:</strong> {foundNome}</div>
          <div><strong>Abrangência:</strong> {todasCidades ? "Todas as cidades" : `${cidadeIds.size} cidade(s)`}</div>
          <div><strong>Permissões:</strong> {permissoes.size === 0 ? "(nenhuma)" : Array.from(permissoes).map((c) => PERMS_FLAT[c]?.label ?? c).join(", ")}</div>
          <div className="flex justify-between">
            <button className="text-white/70 px-3 py-2" onClick={() => setEtapa("permissoes")}>Voltar</button>
            <button className="btn-cta" onClick={confirmar} disabled={busy}>{busy ? "…" : "Confirmar cadastro"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ================= Wizard: Embaixador ================= */
type EtapaEmb = "usuario" | "cidade" | "permissoes" | "revisar";
function EmbaixadorWizard({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [etapa, setEtapa] = useState<EtapaEmb>("usuario");
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [foundNome, setFoundNome] = useState<string | null>(null);
  const [codigoAtivacao, setCodigoAtivacao] = useState<string | null>(null);
  const [cidadeId, setCidadeId] = useState<string>("");
  const [cidades, setCidades] = useState<Cidade[] | null>(null);
  const [permissoes, setPermissoes] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const buscar = useServerFn(buscarUsuarioPorTelefone);
  const criarUser = useServerFn(criarUsuarioAdministrativo);
  const gerarCod = useServerFn(gerarCodigoAtivacao);
  const criarEmb = useServerFn(criarEmbaixador);
  const fetchCidades = useServerFn(listarCidades);

  useEffect(() => {
    if (etapa === "cidade" && !cidades) fetchCidades().then(setCidades).catch((e) => toast.error((e as Error).message));
  }, [etapa, cidades, fetchCidades]);

  async function localizarOuCriar() {
    setBusy(true);
    try {
      const tel = onlyDigits(telefone);
      const u = await buscar({ data: { telefone: tel } });
      if (u) { setUserId(u.id); setFoundNome(u.nome); setCodigoAtivacao(null); toast.success(`Usuário encontrado: ${u.nome}`); }
      else {
        if (!nome.trim()) { toast.error("Informe o nome para criar o novo usuário."); return; }
        const r = await criarUser({ data: { telefone: tel, nome } });
        const ativ = await gerarCod({ data: { user_id: r.user_id } });
        setUserId(r.user_id); setFoundNome(nome); setCodigoAtivacao(ativ.codigo);
        toast.success("Usuário criado. Repasse o código de ativação.");
      }
      setEtapa("cidade");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function togglePerm(cod: string, on: boolean) {
    setPermissoes((s) => {
      const n = new Set(s);
      if (on) { n.add(cod); if (PARES_VIS_ADM[cod]) n.add(PARES_VIS_ADM[cod]); }
      else n.delete(cod);
      return n;
    });
  }

  async function confirmar() {
    if (!userId || !cidadeId) return;
    setBusy(true);
    try {
      await criarEmb({ data: { user_id: userId, cidade_id: cidadeId, permissoes: Array.from(permissoes) } });
      toast.success("Embaixador cadastrado");
      onDone();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Modal onClose={onClose} titulo={`Novo embaixador — ${labelEtapa(etapa)}`}>
      {etapa === "usuario" && (
        <div className="space-y-3">
          <label className="block text-sm">Telefone
            <input value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} placeholder="(00) 00000-0000"
              className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2 outline-none" />
          </label>
          <label className="block text-sm">Nome (se for criar novo)
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2 outline-none" />
          </label>
          {codigoAtivacao && (
            <div className="rounded-lg bg-yellow-500/20 border border-yellow-500/40 p-3 text-sm">
              Código de ativação: <span className="font-mono font-bold">{codigoAtivacao}</span> — exibido só uma vez.
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button className="text-white/70 px-3 py-2" onClick={onClose}>Cancelar</button>
            <button className="btn-cta" onClick={localizarOuCriar} disabled={busy || onlyDigits(telefone).length !== 11}>
              {busy ? "…" : "Localizar / criar"}
            </button>
          </div>
        </div>
      )}
      {etapa === "cidade" && (
        <div className="space-y-3">
          <div className="text-sm">Usuário: <strong>{foundNome}</strong></div>
          <label className="block text-sm">Cidade (exatamente uma)
            <select value={cidadeId} onChange={(e) => setCidadeId(e.target.value)} className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2">
              <option value="">Selecione…</option>
              {cidades?.filter((c) => c.ativa).map((c) => (
                <option key={c.id} value={c.id}>{c.cidade} — {c.estado}</option>
              ))}
            </select>
          </label>
          <div className="flex justify-between">
            <button className="text-white/70 px-3 py-2" onClick={() => setEtapa("usuario")}>Voltar</button>
            <button className="btn-cta" onClick={() => setEtapa("permissoes")} disabled={!cidadeId}>Próximo</button>
          </div>
        </div>
      )}
      {etapa === "permissoes" && (
        <div className="space-y-3">
          <PermissoesGrid selecionadas={permissoes} onChange={togglePerm} />
          <div className="flex justify-between">
            <button className="text-white/70 px-3 py-2" onClick={() => setEtapa("cidade")}>Voltar</button>
            <button className="btn-cta" onClick={() => setEtapa("revisar")}>Próximo</button>
          </div>
        </div>
      )}
      {etapa === "revisar" && (
        <div className="space-y-3 text-sm">
          <div><strong>Usuário:</strong> {foundNome}</div>
          <div><strong>Cidade:</strong> {cidades?.find((c) => c.id === cidadeId)?.cidade}</div>
          <div><strong>Permissões:</strong> {permissoes.size === 0 ? "(nenhuma)" : Array.from(permissoes).map((c) => PERMS_FLAT[c]?.label ?? c).join(", ")}</div>
          <div className="flex justify-between">
            <button className="text-white/70 px-3 py-2" onClick={() => setEtapa("permissoes")}>Voltar</button>
            <button className="btn-cta" onClick={confirmar} disabled={busy}>{busy ? "…" : "Confirmar cadastro"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function labelEtapa(e: string) {
  const map: Record<string, string> = { usuario: "1. Usuário", cidades: "2. Cidades", cidade: "2. Cidade", permissoes: "3. Permissões", revisar: "4. Revisar" };
  return map[e] ?? e;
}

/* ================= Modal ================= */
function Modal({ children, onClose, titulo }: { children: React.ReactNode; onClose: () => void; titulo: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-background border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-bold">{titulo}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ================= Cidades ================= */
function CidadesTab() {
  const [rows, setRows] = useState<Cidade[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<CidadeModalMode>("criar");
  const [modalInitial, setModalInitial] = useState<{ id?: string; cidade?: string; estado?: string }>({});
  const fetchCidades = useServerFn(listarCidades);
  const criarCidadeFn = useServerFn(cidadeCriar);
  const editarCidadeFn = useServerFn(cidadeEditar);
  const ativarCidadeFn = useServerFn(cidadeAtivar);
  const suspenderCidadeFn = useServerFn(cidadeSuspender);
  const definirServicosFn = useServerFn(cidadeDefinirServicos);

  async function toggleServico(c: Cidade, _key: "mototaxi_ativo") {
    const novo = { mototaxi_ativo: !c.mototaxi_ativo };
    setRows((prev) => prev?.map((x) => x.id === c.id ? { ...x, ...novo } : x) ?? prev);
    try {
      await definirServicosFn({ data: { id: c.id, ...novo } });
      toast.success("Serviços atualizados");
    } catch (e) {
      toast.error((e as Error).message);
      refresh();
    }
  }

  async function refresh() {
    try { setRows(await fetchCidades()); }
    catch (e) { toast.error((e as Error).message); }
  }
  useEffect(() => { refresh(); }, []);

  async function toggleAtiva(c: Cidade) {
    if (c.ativa && !confirm(`Suspender ${c.cidade}? Embaixadores dessa cidade perderão o acesso operacional, mas os dados serão preservados.`)) return;
    try {
      if (c.ativa) await suspenderCidadeFn({ data: { id: c.id } });
      else await ativarCidadeFn({ data: { id: c.id } });
      toast.success(`Cidade ${c.ativa ? "suspensa" : "reativada"}`);
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  function abrirCriar() {
    setModalMode("criar");
    setModalInitial({});
    setModalOpen(true);
  }
  function abrirEditar(c: Cidade) {
    setModalMode("editar");
    setModalInitial({ id: c.id, cidade: c.cidade, estado: c.estado });
    setModalOpen(true);
  }
  async function onConfirmModal(v: { cidade?: string; estado?: string } | { cidade_id?: string }) {
    if (!("cidade" in v) || !v.cidade || !v.estado) return;
    if (modalMode === "criar") {
      await criarCidadeFn({ data: { cidade: v.cidade, estado: v.estado } });
      toast.success("Cidade cadastrada");
    } else if (modalMode === "editar" && modalInitial.id) {
      await editarCidadeFn({ data: { id: modalInitial.id, cidade: v.cidade, estado: v.estado } });
      toast.success("Cidade atualizada");
    }
    setModalOpen(false);
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cidades</h2>
        <button className="btn-cta" onClick={abrirCriar}>Cadastrar cidade</button>
      </div>
      {rows === null && <div className="text-white/60">Carregando…</div>}
      {rows && rows.length === 0 && (
        <div className="rounded-xl bg-card border border-white/10 p-6 text-center text-white/60">
          Nenhuma cidade cadastrada.
        </div>
      )}
      <div className="space-y-2">
        {rows?.map((c) => (
          <div key={c.id} className="rounded-xl bg-card border border-white/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">{c.cidade} <span className="text-white/50 text-sm">/ {c.estado}</span></div>
                <div className="text-xs text-white/60">Cadastrada em {new Date(c.criado_em).toLocaleDateString("pt-BR")}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.ativa ? "bg-green-600/40" : "bg-red-600/40"}`}>
                  {c.ativa ? "Ativa" : "Suspensa"}
                </span>
                <button onClick={() => abrirEditar(c)} className="text-xs underline text-white/80">Editar</button>
                <button onClick={() => toggleAtiva(c)} className="text-xs underline text-white/80">
                  {c.ativa ? "Suspender" : "Reativar"}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              {([
                ["mototaxi_ativo", "Moto Táxi"],
              ] as const).map(([key, label]) => (
                <label key={key} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border cursor-pointer ${c[key] ? "border-primary bg-primary/20 text-primary" : "border-white/20 text-white/60"}`}>
                  <input type="checkbox" checked={c[key]} onChange={() => toggleServico(c, key)} className="accent-primary" disabled={!c.ativa} />
                  {label}
                </label>
              ))}
              {!c.ativa && <span className="text-xs text-white/40 self-center">Reative a cidade para configurar serviços</span>}
            </div>
          </div>
        ))}
      </div>
      <CidadeModal
        open={modalOpen}
        mode={modalMode}
        initial={{ cidade: modalInitial.cidade, estado: modalInitial.estado }}
        onCancel={() => setModalOpen(false)}
        onConfirm={onConfirmModal}
      />
    </div>
  );
}

/* ================= Auditoria ================= */
type AudRow = {
  id: string;
  autor_user_id: string;
  autor_nome: string | null;
  tipo_autor: string | null;
  cidade_id: string | null;
  acao: string;
  entidade: string | null;
  entidade_id: string | null;
  criado_em: string;
};
function AuditoriaTab({ cidadeId }: { cidadeId: string | null }) {
  const [rows, setRows] = useState<AudRow[] | null>(null);
  const fetchAud = useServerFn(listarAuditoria);

  useEffect(() => {
    fetchAud({ data: { cidade_id: cidadeId, limit: 200 } })
      .then((d) => setRows(d as AudRow[]))
      .catch((e) => toast.error((e as Error).message));
  }, [cidadeId, fetchAud]);

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Histórico de atividades</h2>
      {rows === null && <div className="text-white/60">Carregando…</div>}
      {rows && rows.length === 0 && (
        <div className="rounded-xl bg-card border border-white/10 p-6 text-center text-white/60">
          Sem registros.
        </div>
      )}
      <div className="space-y-2">
        {rows?.map((r) => (
          <div key={r.id} className="rounded-xl bg-card border border-white/10 p-3 text-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="font-bold">{r.acao}</span>
                {r.entidade && <span className="text-white/60"> · {r.entidade}</span>}
              </div>
              <div className="text-xs text-white/60">{new Date(r.criado_em).toLocaleString("pt-BR")}</div>
            </div>
            <div className="text-xs text-white/70 mt-1">
              {r.autor_nome ?? r.autor_user_id.slice(0, 8)} ({r.tipo_autor ?? "?"})
              {r.entidade_id ? ` · registro ${r.entidade_id.slice(0, 8)}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
