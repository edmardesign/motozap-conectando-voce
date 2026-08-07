// Painel Municipal (Rodada 2.C).
// Entrada de subadmins/embaixadores; admin_principal também pode acessar.
// RLS + me_tem_permissao filtram tudo no banco; a UI habilita/desabilita ações
// conforme permissões e nível hierárquico do usuário.

import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMeuContextoAdmin } from "@/lib/admin-hier.functions";
import {
  painelKpis,
  painelListarPassageiros,
  painelListarMototaxistas,
  painelListarEmpresas,
  painelListarCorridas,
  painelListarEntregas,
  painelListarSaques,
  painelListarAvaliacoes,
  acaoBloquearPassageiro,
  acaoAprovarMototaxista,
  acaoAprovarEmpresa,
  acaoBloquearEmpresa,
  acaoAprovarSaque,
  painelFoodKpis,
  painelFoodListarPedidos,
  painelFoodListarLojas,
  acaoFoodDefinirComissao,
  acaoFoodDefinirStatusLoja,
  painelMercadoKpis,
  painelMercadoListarPedidos,
  painelMercadoListarLojas,
  acaoMercadoDefinirComissao,
  acaoMercadoDefinirStatusLoja,

} from "@/lib/admin-painel.functions";
import { listarAuditoriaEscopo } from "@/lib/admin-hier.functions";
import { maskPhone } from "@/lib/phone";

export const Route = createFileRoute("/_admGate/adm/painel")({
  head: () => ({
    meta: [
      { title: "Bora Zé! • Painel municipal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  // beforeLoad já passou pelo _admGate; contexto disponível em context.adminCtx
  beforeLoad: ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (context as any).adminCtx;
    if (!ctx?.nivel) throw redirect({ to: "/adm/negado" });
    return { adminCtx: ctx };
  },
  component: PainelMunicipal,
});

type Tab =
  | "resumo"
  | "passageiros"
  | "mototaxistas"
  | "empresas"
  | "corridas"
  | "entregas"
  | "saques"
  | "avaliacoes"
  | "comida"
  | "mercado"
  | "auditoria";

type Permissao =
  | "visualizar_passageiros" | "administrar_passageiros"
  | "visualizar_mototaxistas" | "administrar_mototaxistas" | "aprovar_mototaxistas"
  | "visualizar_empresas" | "administrar_empresas"
  | "visualizar_corridas" | "administrar_corridas"
  | "visualizar_entregas" | "administrar_entregas"
  | "administrar_suporte"
  | "visualizar_pagamentos" | "administrar_pagamentos"
  | "cadastrar_cidades" | "administrar_embaixadores"
  | "alterar_configuracoes" | "visualizar_relatorios"
  | "administrar_food"
  | "administrar_mercado";

type Ctx = Awaited<ReturnType<typeof getMeuContextoAdmin>>;

function usePermissoes(ctx: Ctx | null, cidadeSel: string) {
  const [perms, setPerms] = useState<Set<Permissao>>(new Set());
  useEffect(() => {
    if (!ctx) return;
    if (ctx.is_principal) {
      const todas: Permissao[] = [
        "visualizar_passageiros","administrar_passageiros",
        "visualizar_mototaxistas","administrar_mototaxistas","aprovar_mototaxistas",
        "visualizar_empresas","administrar_empresas",
        "visualizar_corridas","administrar_corridas",
        "visualizar_entregas","administrar_entregas",
        "administrar_suporte",
        "visualizar_pagamentos","administrar_pagamentos",
        "cadastrar_cidades","administrar_embaixadores",
        "alterar_configuracoes","visualizar_relatorios",
        "administrar_food",
      "administrar_mercado",
      ];
      setPerms(new Set(todas));
      return;
    }
    // Consulta banco para permissões efetivas (respeitando cidade selecionada).
    (async () => {
      const codigos: Permissao[] = [
        "visualizar_passageiros","administrar_passageiros",
        "visualizar_mototaxistas","administrar_mototaxistas","aprovar_mototaxistas",
        "visualizar_empresas","administrar_empresas",
        "visualizar_corridas","administrar_corridas",
        "visualizar_entregas","administrar_entregas",
        "administrar_suporte",
        "visualizar_pagamentos","administrar_pagamentos",
        "cadastrar_cidades","administrar_embaixadores",
        "alterar_configuracoes","visualizar_relatorios",
        "administrar_food",
      "administrar_mercado",
      ];
      const cid = cidadeSel !== "todas" ? cidadeSel : (ctx.cidades[0]?.id ?? null);
      const results = await Promise.all(
        codigos.map(async (c) => {
          const { data } = await supabase.rpc("me_tem_permissao", {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            _codigo: c as any,
            _cidade_id: cid,
          });
          return [c, !!data] as const;
        }),
      );
      const set = new Set<Permissao>();
      for (const [c, ok] of results) if (ok) set.add(c);
      setPerms(set);
    })();
  }, [ctx, cidadeSel]);
  return perms;
}

function PainelMunicipal() {
  const navigate = useNavigate();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [tab, setTab] = useState<Tab>("resumo");
  const [cidadeSel, setCidadeSel] = useState<string>("todas");
  const fetchCtx = useServerFn(getMeuContextoAdmin);

  useEffect(() => {
    (async () => {
      const c = await fetchCtx();
      setCtx(c);
      // Embaixador: cidade travada em ctx.cidades[0]
      if (c.nivel === "embaixador" && c.cidades[0]) {
        setCidadeSel(c.cidades[0].id);
      } else if (c.nivel === "subadmin" && !c.is_principal && c.cidades.length === 1) {
        setCidadeSel(c.cidades[0].id);
      }
    })();
  }, [fetchCtx]);

  const perms = usePermissoes(ctx, cidadeSel);

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/admin", replace: true });
  }

  if (!ctx) {
    return (
      <div className="min-h-screen bg-black p-6 text-white/70">Carregando painel…</div>
    );
  }

  const cidadesOpts = ctx.cidades.filter((c) => c.ativa);
  const cidadeEfetiva = cidadeSel === "todas" ? null : cidadeSel;
  const nivelLabel =
    ctx.nivel === "admin_principal" ? "Admin principal"
      : ctx.nivel === "subadmin" ? "Subadmin"
      : "Embaixador";
  const podeTrocarCidade = ctx.nivel !== "embaixador";

  const abas: { id: Tab; label: string; perm?: Permissao }[] = [
    { id: "resumo", label: "Resumo" },
    { id: "passageiros", label: "Passageiros", perm: "visualizar_passageiros" },
    { id: "mototaxistas", label: "Mototaxistas", perm: "visualizar_mototaxistas" },
    { id: "empresas", label: "Empresas", perm: "visualizar_empresas" },
    { id: "corridas", label: "Corridas", perm: "visualizar_corridas" },
    { id: "entregas", label: "Entregas", perm: "visualizar_entregas" },
    { id: "saques", label: "Saques", perm: "visualizar_pagamentos" },
    { id: "avaliacoes", label: "Avaliações", perm: "administrar_suporte" },
    { id: "comida", label: "Comida", perm: "administrar_food" },
    { id: "mercado", label: "Mercado", perm: "administrar_mercado" },
    { id: "auditoria", label: "Auditoria", perm: "visualizar_relatorios" },
  ];
  const abasVisiveis = abas.filter((a) => !a.perm || perms.has(a.perm));

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-bold">Bora Zé!</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{nivelLabel}</span>
            {ctx.nivel !== "embaixador" && ctx.is_principal && (
              <button
                onClick={() => navigate({ to: "/adm/gestao" })}
                className="text-xs text-[#00FF1A] hover:underline"
              >
                → Gestão
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {podeTrocarCidade && (
              <select
                value={cidadeSel}
                onChange={(e) => setCidadeSel(e.target.value)}
                aria-label="Filtrar por cidade"
                className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-1.5 text-sm"
              >
                {ctx.is_principal && <option value="todas">Todas as cidades</option>}
                {cidadesOpts.length === 0 && !ctx.is_principal && (
                  <option value="todas" disabled>— sem cidades atribuídas —</option>
                )}
                {cidadesOpts.map((c) => (
                  <option key={c.id} value={c.id}>{c.cidade} · {c.estado}</option>
                ))}
              </select>
            )}
            {!podeTrocarCidade && ctx.cidades[0] && (
              <span className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-1.5 text-sm">
                {ctx.cidades[0].cidade} · {ctx.cidades[0].estado}
              </span>
            )}
            <button
              onClick={sair}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
            >
              Sair
            </button>
          </div>
        </div>
        <nav aria-label="Áreas" className="mx-auto max-w-6xl overflow-x-auto px-2 pb-2">
          <div className="flex gap-1">
            {abasVisiveis.map((a) => (
              <button
                key={a.id}
                onClick={() => setTab(a.id)}
                aria-current={tab === a.id ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
                  tab === a.id ? "bg-[#00FF1A] text-black font-semibold" : "text-white/80 hover:bg-white/5"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {ctx.nivel !== "embaixador" && !ctx.is_principal && ctx.cidades.length === 0 && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-4 text-sm text-yellow-100">
            Nenhuma cidade atribuída ao seu perfil. Peça ao admin principal para vincular ao menos uma cidade.
          </div>
        )}
        {tab === "resumo" && <TabResumo cidadeId={cidadeEfetiva} />}
        {tab === "passageiros" && perms.has("visualizar_passageiros") && (
          <TabPassageiros cidadeId={cidadeEfetiva} podeAdmin={perms.has("administrar_passageiros")} />
        )}
        {tab === "mototaxistas" && perms.has("visualizar_mototaxistas") && (
          <TabMototaxistas
            cidadeId={cidadeEfetiva}
            podeAdmin={perms.has("administrar_mototaxistas")}
            podeAprovar={perms.has("aprovar_mototaxistas")}
          />
        )}
        {tab === "empresas" && perms.has("visualizar_empresas") && (
          <TabEmpresas cidadeId={cidadeEfetiva} podeAdmin={perms.has("administrar_empresas")} />
        )}
        {tab === "corridas" && perms.has("visualizar_corridas") && (
          <TabCorridas cidadeId={cidadeEfetiva} />
        )}
        {tab === "entregas" && perms.has("visualizar_entregas") && (
          <TabEntregas cidadeId={cidadeEfetiva} />
        )}
        {tab === "saques" && perms.has("visualizar_pagamentos") && (
          <TabSaques cidadeId={cidadeEfetiva} podeAdmin={perms.has("administrar_pagamentos")} />
        )}
        {tab === "avaliacoes" && perms.has("administrar_suporte") && (
          <TabAvaliacoes cidadeId={cidadeEfetiva} />
        )}
        {tab === "comida" && perms.has("administrar_food") && (
          <TabComida cidadeId={cidadeEfetiva} />
        )}
        {tab === "mercado" && perms.has("administrar_mercado") && (
          <TabMercado cidadeId={cidadeEfetiva} />
        )}
        {tab === "auditoria" && perms.has("visualizar_relatorios") && (
          <TabAuditoria cidadeId={cidadeEfetiva} />
        )}
      </main>
    </div>
  );
}

/* ========================= Componentes de aba ========================= */

function usePaginado<T>(
  fn: (input: {
    cidade_id: string | null;
    q?: string;
    status?: string;
    page: number;
    page_size: number;
  }) => Promise<{ rows: T[]; total: number; page: number; size: number }>,
  cidadeId: string | null,
  extraStatus = "todos",
) {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(extraStatus);
  const [page, setPage] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const size = 20;

  async function refetch() {
    setCarregando(true);
    try {
      const r = await fn({ cidade_id: cidadeId, q, status, page, page_size: size });
      setRows(r.rows);
      setTotal(r.total);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { refetch(); /* eslint-disable-next-line */ }, [cidadeId, status, page]);
  // eslint-disable-next-line
  const doSearch = () => { setPage(1); refetch(); };
  return { rows, total, q, setQ, status, setStatus, page, setPage, carregando, doSearch, refetch, size };
}

function Toolbar({
  q, setQ, doSearch, filtros, page, setPage, total, size,
}: {
  q: string; setQ: (v: string) => void; doSearch: () => void;
  filtros?: React.ReactNode;
  page: number; setPage: (n: number) => void; total: number; size: number;
}) {
  const maxPage = Math.max(1, Math.ceil(total / size));
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => { e.preventDefault(); doSearch(); }}
        className="flex flex-1 min-w-[240px] items-center gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou telefone…"
          className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
        >
          Buscar
        </button>
      </form>
      {filtros}
      <div className="ml-auto flex items-center gap-2 text-sm">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-white/10 px-2 py-1 disabled:opacity-40"
        >
          ‹
        </button>
        <span className="text-white/70">
          {page} / {maxPage} · {total} total
        </span>
        <button
          onClick={() => setPage(Math.min(maxPage, page + 1))}
          disabled={page >= maxPage}
          className="rounded-lg border border-white/10 px-2 py-1 disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function TabResumo({ cidadeId }: { cidadeId: string | null }) {
  const kpi = useServerFn(painelKpis);
  const [d, setD] = useState<Awaited<ReturnType<typeof painelKpis>> | null>(null);
  useEffect(() => {
    kpi({ data: { cidade_id: cidadeId } }).then(setD).catch((e) => toast.error(e.message));
  }, [kpi, cidadeId]);
  const cards = [
    { k: "Passageiros", v: d?.passageiros },
    { k: "Mototaxistas", v: d?.mototaxistas },
    { k: "Empresas", v: d?.empresas },
    { k: "Corridas hoje", v: d?.corridas_hoje },
    { k: "Saques pendentes", v: d?.saques_pendentes },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.k} className="rounded-xl border border-white/10 bg-neutral-950 p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">{c.k}</div>
          <div className="mt-1 text-2xl font-bold">
            {c.v ?? <span className="text-white/30">—</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabPassageiros({ cidadeId, podeAdmin }: { cidadeId: string | null; podeAdmin: boolean }) {
  const listar = useServerFn(painelListarPassageiros);
  const bloquear = useServerFn(acaoBloquearPassageiro);
  const s = usePaginado<{ id: string; nome: string; telefone: string; cidade: string | null; ativo: boolean; criado_em: string }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input) => listar({ data: input as any }) as any,
    cidadeId,
  );
  async function toggleAtivo(id: string, ativoAtual: boolean) {
    if (!podeAdmin) return;
    if (!confirm(ativoAtual ? "Bloquear passageiro?" : "Reativar passageiro?")) return;
    try {
      await bloquear({ data: { id, ativo: !ativoAtual } });
      toast.success(ativoAtual ? "Bloqueado" : "Reativado");
      s.refetch();
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <>
      <Toolbar q={s.q} setQ={s.setQ} doSearch={s.doSearch}
        page={s.page} setPage={s.setPage} total={s.total} size={s.size} />
      <TabelaBase carregando={s.carregando} vazio={s.rows.length === 0}>
        {s.rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-neutral-950 p-3">
            <div className="flex-1 min-w-[200px]">
              <div className="font-medium">{r.nome}</div>
              <div className="text-xs text-white/60">{maskPhone(r.telefone)} · {r.cidade ?? "—"}</div>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs ${r.ativo ? "bg-green-600/20 text-green-200" : "bg-red-600/20 text-red-200"}`}>
              {r.ativo ? "Ativo" : "Bloqueado"}
            </span>
            {podeAdmin && (
              <button
                onClick={() => toggleAtivo(r.id, r.ativo)}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs hover:bg-white/5"
              >
                {r.ativo ? "Bloquear" : "Reativar"}
              </button>
            )}
          </div>
        ))}
      </TabelaBase>
    </>
  );
}

function TabMototaxistas({
  cidadeId, podeAdmin, podeAprovar,
}: { cidadeId: string | null; podeAdmin: boolean; podeAprovar: boolean }) {
  const listar = useServerFn(painelListarMototaxistas);
  const bloquear = useServerFn(acaoBloquearPassageiro);
  const aprovar = useServerFn(acaoAprovarMototaxista);
  type Row = {
    id: string; nome: string; telefone: string; cidade: string | null; ativo: boolean; criado_em: string;
    moto: null | {
      status_cadastro: string; mensalidade_ativa: boolean; pagamento_confirmado: boolean;
      plano: string | null; plano_validade: string | null; total_corridas: number;
    };
  };
  const s = usePaginado<Row>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input) => listar({ data: input as any }) as any,
    cidadeId,
  );
  async function acaoAprovar(id: string) {
    try {
      await aprovar({ data: { mototaxista_id: id, plano: "mensal", dias: 30 } });
      toast.success("Aprovado (mensal · 30 dias)");
      s.refetch();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function acaoBloquear(id: string, ativoAtual: boolean) {
    if (!confirm(ativoAtual ? "Bloquear mototaxista?" : "Reativar mototaxista?")) return;
    try {
      await bloquear({ data: { id, ativo: !ativoAtual } });
      toast.success(ativoAtual ? "Bloqueado" : "Reativado");
      s.refetch();
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <>
      <Toolbar q={s.q} setQ={s.setQ} doSearch={s.doSearch}
        filtros={
          <select value={s.status} onChange={(e) => { s.setStatus(e.target.value); s.setPage(1); }}
            className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-2 text-sm">
            <option value="todos">Status: todos</option>
            <option value="aguardando_foto">Aguardando foto</option>
            <option value="aguardando_aprovacao">Aguardando aprovação</option>
            <option value="aprovado">Aprovado</option>
            <option value="reprovado">Reprovado</option>
          </select>
        }
        page={s.page} setPage={s.setPage} total={s.total} size={s.size} />
      <TabelaBase carregando={s.carregando} vazio={s.rows.length === 0}>
        {s.rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-neutral-950 p-3">
            <div className="flex-1 min-w-[220px]">
              <div className="font-medium">{r.nome}</div>
              <div className="text-xs text-white/60">
                {maskPhone(r.telefone)} · {r.cidade ?? "—"} · {r.moto?.total_corridas ?? 0} corridas
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  {r.moto?.status_cadastro ?? "—"}
                </span>
                {r.moto?.mensalidade_ativa && (
                  <span className="rounded-full bg-green-600/20 px-2 py-0.5 text-[10px] text-green-200">
                    Ativo · {r.moto.plano ?? "?"}
                  </span>
                )}
                {!r.ativo && (
                  <span className="rounded-full bg-red-600/20 px-2 py-0.5 text-[10px] text-red-200">Bloqueado</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {podeAprovar && r.moto && !r.moto.mensalidade_ativa && (
                <button
                  onClick={() => acaoAprovar(r.id)}
                  className="rounded-lg bg-[#00FF1A] px-2 py-1 text-xs font-semibold text-black hover:opacity-90"
                >
                  Aprovar (30d)
                </button>
              )}
              {podeAdmin && (
                <button
                  onClick={() => acaoBloquear(r.id, r.ativo)}
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs hover:bg-white/5"
                >
                  {r.ativo ? "Bloquear" : "Reativar"}
                </button>
              )}
            </div>
          </div>
        ))}
      </TabelaBase>
    </>
  );
}

function TabEmpresas({ cidadeId, podeAdmin }: { cidadeId: string | null; podeAdmin: boolean }) {
  const listar = useServerFn(painelListarEmpresas);
  const aprovar = useServerFn(acaoAprovarEmpresa);
  const bloquear = useServerFn(acaoBloquearEmpresa);
  type Row = { id: string; nome: string; telefone: string; documento: string | null; cidade: string | null;
    mensalidade_ativa: boolean; plano_validade: string | null; criado_em: string };
  const s = usePaginado<Row>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input) => listar({ data: input as any }) as any, cidadeId);
  async function acAprovar(id: string) {
    try {
      await aprovar({ data: { empresa_id: id } });
      toast.success("Empresa aprovada"); s.refetch();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function acBloquear(id: string) {
    if (!confirm("Bloquear/reativar empresa?")) return;
    try {
      await bloquear({ data: { empresa_id: id } });
      toast.success("Status atualizado"); s.refetch();
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <>
      <Toolbar q={s.q} setQ={s.setQ} doSearch={s.doSearch}
        filtros={
          <select value={s.status} onChange={(e) => { s.setStatus(e.target.value); s.setPage(1); }}
            className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-2 text-sm">
            <option value="todos">Status: todos</option>
            <option value="ativas">Ativas</option>
            <option value="pendentes">Pendentes</option>
          </select>
        }
        page={s.page} setPage={s.setPage} total={s.total} size={s.size} />
      <TabelaBase carregando={s.carregando} vazio={s.rows.length === 0}>
        {s.rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-neutral-950 p-3">
            <div className="flex-1 min-w-[220px]">
              <div className="font-medium">{r.nome}</div>
              <div className="text-xs text-white/60">
                {maskPhone(r.telefone)} · {r.documento ?? "sem doc"} · {r.cidade ?? "—"}
              </div>
              <div className="mt-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${r.mensalidade_ativa ? "bg-green-600/20 text-green-200" : "bg-yellow-600/20 text-yellow-100"}`}>
                  {r.mensalidade_ativa ? `Ativa até ${r.plano_validade ?? "?"}` : "Pendente"}
                </span>
              </div>
            </div>
            {podeAdmin && (
              <div className="flex flex-wrap gap-2">
                {!r.mensalidade_ativa && (
                  <button onClick={() => acAprovar(r.id)}
                    className="rounded-lg bg-[#00FF1A] px-2 py-1 text-xs font-semibold text-black hover:opacity-90">
                    Aprovar
                  </button>
                )}
                <button onClick={() => acBloquear(r.id)}
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs hover:bg-white/5">
                  Bloquear/Reativar
                </button>
              </div>
            )}
          </div>
        ))}
      </TabelaBase>
    </>
  );
}

function TabCorridas({ cidadeId }: { cidadeId: string | null }) {
  const listar = useServerFn(painelListarCorridas);
  type Row = { id: string; origem_endereco: string; destino_endereco: string; valor_final: number | null;
    status: string; criado_em: string };
  const s = usePaginado<Row>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input) => listar({ data: input as any }) as any, cidadeId);
  return (
    <>
      <Toolbar q={s.q} setQ={s.setQ} doSearch={() => s.setPage(1)}
        filtros={
          <select value={s.status} onChange={(e) => { s.setStatus(e.target.value); s.setPage(1); }}
            className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-2 text-sm">
            <option value="todos">Status: todos</option>
            <option value="aguardando">Aguardando</option>
            <option value="aceita">Aceita</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </select>
        }
        page={s.page} setPage={s.setPage} total={s.total} size={s.size} />
      <TabelaBase carregando={s.carregando} vazio={s.rows.length === 0}>
        {s.rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-white/5 bg-neutral-950 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm">
                  <span className="text-white/60">De:</span> {r.origem_endereco}
                </div>
                <div className="truncate text-sm">
                  <span className="text-white/60">Para:</span> {r.destino_endereco}
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold">{r.valor_final ? `R$ ${Number(r.valor_final).toFixed(2)}` : "—"}</div>
                <div className="text-white/50">{new Date(r.criado_em).toLocaleString("pt-BR")}</div>
                <span className="mt-1 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px]">{r.status}</span>
              </div>
            </div>
          </div>
        ))}
      </TabelaBase>
    </>
  );
}

function TabEntregas({ cidadeId }: { cidadeId: string | null }) {
  const listar = useServerFn(painelListarEntregas);
  type Row = { id: string; coleta_endereco: string; entrega_endereco: string; valor: number | null;
    status: string; criado_em: string };
  const s = usePaginado<Row>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input) => listar({ data: input as any }) as any, cidadeId);
  return (
    <>
      <Toolbar q={s.q} setQ={s.setQ} doSearch={() => s.setPage(1)}
        filtros={
          <select value={s.status} onChange={(e) => { s.setStatus(e.target.value); s.setPage(1); }}
            className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-2 text-sm">
            <option value="todos">Status: todos</option>
            <option value="aguardando">Aguardando</option>
            <option value="aceita">Aceita</option>
            <option value="entregue">Entregue</option>
            <option value="cancelada">Cancelada</option>
          </select>
        }
        page={s.page} setPage={s.setPage} total={s.total} size={s.size} />
      <TabelaBase carregando={s.carregando} vazio={s.rows.length === 0}>
        {s.rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-white/5 bg-neutral-950 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm"><span className="text-white/60">Coleta:</span> {r.coleta_endereco}</div>
                <div className="truncate text-sm"><span className="text-white/60">Entrega:</span> {r.entrega_endereco}</div>
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold">{r.valor ? `R$ ${Number(r.valor).toFixed(2)}` : "—"}</div>
                <div className="text-white/50">{new Date(r.criado_em).toLocaleString("pt-BR")}</div>
                <span className="mt-1 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px]">{r.status}</span>
              </div>
            </div>
          </div>
        ))}
      </TabelaBase>
    </>
  );
}

function TabSaques({ cidadeId, podeAdmin }: { cidadeId: string | null; podeAdmin: boolean }) {
  const listar = useServerFn(painelListarSaques);
  const aprovar = useServerFn(acaoAprovarSaque);
  type Row = {
    id: string; mototaxista_id: string; valor: number; chave_pix: string | null; tipo: string; status: string;
    solicitado_em: string; processado_em: string | null; observacao: string | null;
    moto: null | { id: string; nome: string; telefone: string };
  };
  const s = usePaginado<Row>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input) => listar({ data: input as any }) as any, cidadeId, "pendente");
  async function aprovarSaque(id: string) {
    if (!confirm("Confirmar aprovação e pagamento deste saque?")) return;
    try {
      await aprovar({ data: { saque_id: id } });
      toast.success("Saque aprovado"); s.refetch();
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <>
      <Toolbar q={s.q} setQ={s.setQ} doSearch={() => s.setPage(1)}
        filtros={
          <select value={s.status} onChange={(e) => { s.setStatus(e.target.value); s.setPage(1); }}
            className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-2 text-sm">
            <option value="pendente">Pendentes</option>
            <option value="aprovada">Aprovadas</option>
            <option value="rejeitada">Rejeitadas</option>
            <option value="todos">Todos</option>
          </select>
        }
        page={s.page} setPage={s.setPage} total={s.total} size={s.size} />
      <TabelaBase carregando={s.carregando} vazio={s.rows.length === 0}>
        {s.rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-neutral-950 p-3">
            <div className="flex-1 min-w-[220px]">
              <div className="font-medium">{r.moto?.nome ?? "(sem nome)"}</div>
              <div className="text-xs text-white/60">
                {r.moto?.telefone ? maskPhone(r.moto.telefone) : ""} · PIX: {r.chave_pix ?? "—"}
              </div>
              <div className="text-xs text-white/50">{new Date(r.solicitado_em).toLocaleString("pt-BR")}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">R$ {Number(r.valor).toFixed(2)}</div>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px]">{r.status}</span>
            </div>
            {podeAdmin && r.status === "pendente" && (
              <button onClick={() => aprovarSaque(r.id)}
                className="rounded-lg bg-[#00FF1A] px-3 py-1 text-xs font-semibold text-black hover:opacity-90">
                Aprovar
              </button>
            )}
          </div>
        ))}
      </TabelaBase>
    </>
  );
}

function TabAvaliacoes({ cidadeId }: { cidadeId: string | null }) {
  const listar = useServerFn(painelListarAvaliacoes);
  type Row = { id: string; nota: number; comentario: string | null; criado_em: string;
    corrida: null | { origem_endereco: string; destino_endereco: string } };
  const s = usePaginado<Row>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input) => listar({ data: input as any }) as any, cidadeId);
  return (
    <>
      <Toolbar q={s.q} setQ={s.setQ} doSearch={() => s.setPage(1)}
        page={s.page} setPage={s.setPage} total={s.total} size={s.size} />
      <TabelaBase carregando={s.carregando} vazio={s.rows.length === 0}>
        {s.rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-white/5 bg-neutral-950 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">{"★".repeat(r.nota)}{"☆".repeat(5 - r.nota)}</div>
              <div className="text-xs text-white/50">{new Date(r.criado_em).toLocaleString("pt-BR")}</div>
            </div>
            {r.comentario && <p className="mt-1 text-sm text-white/80">{r.comentario}</p>}
            {r.corrida && (
              <div className="mt-1 text-xs text-white/50">
                {r.corrida.origem_endereco} → {r.corrida.destino_endereco}
              </div>
            )}
          </div>
        ))}
      </TabelaBase>
    </>
  );
}

function TabAuditoria({ cidadeId }: { cidadeId: string | null }) {
  const listar = useServerFn(listarAuditoriaEscopo);
  const [rows, setRows] = useState<Array<{
    id: string; acao: string; entidade: string | null; entidade_id: string | null;
    autor_nome: string | null; criado_em: string;
  }>>([]);
  const [carregando, setCarregando] = useState(false);
  useEffect(() => {
    setCarregando(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listar({ data: { cidade_id: cidadeId, limit: 200 } as any })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((r: any) => setRows(r ?? []))
      .catch((e) => toast.error(e.message))
      .finally(() => setCarregando(false));
  }, [listar, cidadeId]);
  return (
    <TabelaBase carregando={carregando} vazio={rows.length === 0}>
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border border-white/5 bg-neutral-950 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase">{r.acao}</span>
            <span className="text-xs text-white/50">{new Date(r.criado_em).toLocaleString("pt-BR")}</span>
          </div>
          <div className="mt-1 text-sm">
            {r.entidade ?? "?"} · {r.entidade_id ?? ""}
          </div>
          {r.autor_nome && <div className="text-xs text-white/50">por {r.autor_nome}</div>}
        </div>
      ))}
    </TabelaBase>
  );
}

function TabelaBase({
  carregando, vazio, children,
}: { carregando: boolean; vazio: boolean; children: React.ReactNode }) {
  if (carregando) return <div className="rounded-xl border border-white/10 bg-neutral-950 p-6 text-center text-white/60">Carregando…</div>;
  if (vazio) return <div className="rounded-xl border border-white/10 bg-neutral-950 p-6 text-center text-white/50">Nenhum registro encontrado.</div>;
  return <div className="space-y-2">{children}</div>;
}

/* ========================= Aba Comida ========================= */
function TabComida({ cidadeId }: { cidadeId: string | null }) {
  const kpi = useServerFn(painelFoodKpis);
  const listarPed = useServerFn(painelFoodListarPedidos);
  const listarLojas = useServerFn(painelFoodListarLojas);
  const definir = useServerFn(acaoFoodDefinirComissao);
  const definirStatus = useServerFn(acaoFoodDefinirStatusLoja);


  const [k, setK] = useState<Awaited<ReturnType<typeof painelFoodKpis>> | null>(null);
  type Pedido = {
    id: string; numero_pedido: number; status: string; total: number;
    forma_pagamento: string; loja_nome: string; cliente_nome: string; created_at: string;
  };
  type Loja = {
    id: string; nome: string; cidade_id: string | null; aberto: boolean; pausado: boolean;
    ativo: boolean; comissao_percentual: number; pedidos_hoje: number; faturamento_hoje: number;
  };
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [status, setStatus] = useState<string>("todos");
  const [carregando, setCarregando] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});

  async function carregar() {
    setCarregando(true);
    try {
      const [kk, pp, ll] = await Promise.all([
        kpi({ data: { cidade_id: cidadeId } }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listarPed({ data: { cidade_id: cidadeId, status } as any }),
        listarLojas({ data: { cidade_id: cidadeId } }),
      ]);
      setK(kk);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPedidos((pp as any).rows ?? []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLojas((ll as any).rows ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [cidadeId, status]);

  async function salvarComissao(id: string) {
    const raw = edits[id];
    const pct = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error("Percentual inválido (0 a 100)"); return;
    }
    try {
      await definir({ data: { loja_id: id, percentual: pct } });
      toast.success("Comissão atualizada");
      setEdits((e) => { const n = { ...e }; delete n[id]; return n; });
      carregar();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function alternarStatus(l: Loja, campo: "ativo" | "pausado") {
    const novoAtivo = campo === "ativo" ? !l.ativo : l.ativo;
    const novoPausado = campo === "pausado" ? !l.pausado : l.pausado;
    const msg = campo === "ativo"
      ? (l.ativo ? `Bloquear a loja "${l.nome}"? Ela não aparecerá mais pros clientes.` : `Reativar a loja "${l.nome}"?`)
      : (l.pausado ? `Retomar pedidos da loja "${l.nome}"?` : `Pausar a loja "${l.nome}"? Ela continua visível mas não aceita novos pedidos.`);
    if (!window.confirm(msg)) return;
    try {
      await definirStatus({ data: { loja_id: l.id, ativo: novoAtivo, pausado: novoPausado } });
      toast.success("Status atualizado");
      carregar();
    } catch (e) { toast.error((e as Error).message); }
  }


  const kpis = [
    { k: "Pedidos hoje", v: k?.total },
    { k: "Faturamento", v: k ? `R$ ${k.faturamento.toFixed(2)}` : undefined },
    { k: "Comissão plataforma", v: k ? `R$ ${k.comissao.toFixed(2)}` : undefined },
    { k: "Ticket médio", v: k ? `R$ ${k.ticket_medio.toFixed(2)}` : undefined },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((c) => (
          <div key={c.k} className="rounded-xl border border-white/10 bg-neutral-950 p-4">
            <div className="text-xs uppercase tracking-wide text-white/50">{c.k}</div>
            <div className="mt-1 text-2xl font-bold">
              {c.v ?? <span className="text-white/30">—</span>}
            </div>
          </div>
        ))}
      </div>

      {k && Object.keys(k.por_status).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(k.por_status).map(([st, n]) => (
            <span key={st} className="rounded-full border border-white/10 bg-neutral-950 px-3 py-1 text-xs">
              {st}: <b>{n}</b>
            </span>
          ))}
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white/80">Pedidos ao vivo (últimos 100)</h3>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-sm"
          >
            <option value="todos">Todos</option>
            <option value="novo">Novo</option>
            <option value="confirmado">Confirmado</option>
            <option value="em_preparo">Em preparo</option>
            <option value="pronto">Pronto</option>
            <option value="em_entrega">Em entrega</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <TabelaBase carregando={carregando} vazio={pedidos.length === 0}>
          {pedidos.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-neutral-950 p-3">
              <div className="flex-1 min-w-[220px]">
                <div className="font-medium">#{p.numero_pedido} · {p.loja_nome}</div>
                <div className="text-xs text-white/60">
                  {p.cliente_nome} · {p.forma_pagamento} · {new Date(p.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase">{p.status}</span>
              <div className="text-right font-bold">R$ {Number(p.total).toFixed(2)}</div>
            </div>
          ))}
        </TabelaBase>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-white/80">Restaurantes</h3>
        <TabelaBase carregando={carregando} vazio={lojas.length === 0}>
          {lojas.map((l) => {
            const editing = edits[l.id] ?? String(l.comissao_percentual);
            const dirty = edits[l.id] !== undefined && Number(edits[l.id]) !== Number(l.comissao_percentual);
            return (
              <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-neutral-950 p-3">
                <div className="flex-1 min-w-[220px]">
                  <div className="font-medium">{l.nome}</div>
                  <div className="text-xs text-white/60">
                    {l.aberto ? "Aberto" : "Fechado"}{l.pausado ? " · pausado" : ""} · {l.pedidos_hoje} pedido(s) hoje · R$ {l.faturamento_hoje.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" step="0.5" min="0" max="100"
                    value={editing}
                    onChange={(e) => setEdits((es) => ({ ...es, [l.id]: e.target.value }))}
                    className="w-20 rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-sm"
                    aria-label={`Comissão de ${l.nome}`}
                  />
                  <span className="text-xs text-white/60">%</span>
                  <button
                    onClick={() => salvarComissao(l.id)}
                    disabled={!dirty}
                    className="ml-1 rounded-lg bg-[#00FF1A] px-3 py-1 text-xs font-semibold text-black disabled:opacity-30"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => alternarStatus(l, "pausado")}
                    className="ml-1 rounded-lg border border-white/20 bg-neutral-900 px-3 py-1 text-xs font-semibold text-white hover:bg-neutral-800"
                    title={l.pausado ? "Retomar pedidos" : "Pausar pedidos"}
                  >
                    {l.pausado ? "Retomar" : "Pausar"}
                  </button>
                  <button
                    onClick={() => alternarStatus(l, "ativo")}
                    className={`ml-1 rounded-lg px-3 py-1 text-xs font-semibold ${l.ativo ? "bg-red-600 text-white hover:bg-red-500" : "bg-white/10 text-white hover:bg-white/20"}`}
                    title={l.ativo ? "Bloquear loja" : "Reativar loja"}
                  >
                    {l.ativo ? "Bloquear" : "Reativar"}
                  </button>
                </div>
              </div>
            );
          })}
        </TabelaBase>
      </section>
    </div>
  );
}

/* ========================= Aba Mercado ========================= */
function TabMercado({ cidadeId }: { cidadeId: string | null }) {
  const kpi = useServerFn(painelMercadoKpis);
  const listarPed = useServerFn(painelMercadoListarPedidos);
  const listarLojas = useServerFn(painelMercadoListarLojas);
  const definir = useServerFn(acaoMercadoDefinirComissao);
  const definirStatus = useServerFn(acaoMercadoDefinirStatusLoja);


  const [k, setK] = useState<Awaited<ReturnType<typeof painelMercadoKpis>> | null>(null);
  type Pedido = {
    id: string; numero_pedido: number; status: string; total: number;
    forma_pagamento: string; loja_nome: string; cliente_nome: string; created_at: string;
  };
  type Loja = {
    id: string; nome: string; cidade_id: string | null; aberto: boolean; pausado: boolean;
    ativo: boolean; comissao_percentual: number; pedidos_hoje: number; faturamento_hoje: number;
  };
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [status, setStatus] = useState<string>("todos");
  const [carregando, setCarregando] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});

  async function carregar() {
    setCarregando(true);
    try {
      const [kk, pp, ll] = await Promise.all([
        kpi({ data: { cidade_id: cidadeId } }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listarPed({ data: { cidade_id: cidadeId, status } as any }),
        listarLojas({ data: { cidade_id: cidadeId } }),
      ]);
      setK(kk);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPedidos((pp as any).rows ?? []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLojas((ll as any).rows ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [cidadeId, status]);

  async function salvarComissao(id: string) {
    const raw = edits[id];
    const pct = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error("Percentual inválido (0 a 100)"); return;
    }
    try {
      await definir({ data: { loja_id: id, percentual: pct } });
      toast.success("Comissão atualizada");
      setEdits((e) => { const n = { ...e }; delete n[id]; return n; });
      carregar();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function alternarStatus(l: Loja, campo: "ativo" | "pausado") {
    const novoAtivo = campo === "ativo" ? !l.ativo : l.ativo;
    const novoPausado = campo === "pausado" ? !l.pausado : l.pausado;
    const msg = campo === "ativo"
      ? (l.ativo ? `Bloquear a loja "${l.nome}"? Ela não aparecerá mais pros clientes.` : `Reativar a loja "${l.nome}"?`)
      : (l.pausado ? `Retomar pedidos da loja "${l.nome}"?` : `Pausar a loja "${l.nome}"? Ela continua visível mas não aceita novos pedidos.`);
    if (!window.confirm(msg)) return;
    try {
      await definirStatus({ data: { loja_id: l.id, ativo: novoAtivo, pausado: novoPausado } });
      toast.success("Status atualizado");
      carregar();
    } catch (e) { toast.error((e as Error).message); }
  }


  const kpis = [
    { k: "Pedidos hoje", v: k?.total },
    { k: "Faturamento", v: k ? `R$ ${k.faturamento.toFixed(2)}` : undefined },
    { k: "Comissão plataforma", v: k ? `R$ ${k.comissao.toFixed(2)}` : undefined },
    { k: "Ticket médio", v: k ? `R$ ${k.ticket_medio.toFixed(2)}` : undefined },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((c) => (
          <div key={c.k} className="rounded-xl border border-white/10 bg-neutral-950 p-4">
            <div className="text-xs uppercase tracking-wide text-white/50">{c.k}</div>
            <div className="mt-1 text-2xl font-bold">
              {c.v ?? <span className="text-white/30">—</span>}
            </div>
          </div>
        ))}
      </div>

      {k && Object.keys(k.por_status).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(k.por_status).map(([st, n]) => (
            <span key={st} className="rounded-full border border-white/10 bg-neutral-950 px-3 py-1 text-xs">
              {st}: <b>{n}</b>
            </span>
          ))}
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white/80">Pedidos ao vivo (últimos 100)</h3>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-sm"
          >
            <option value="todos">Todos</option>
            <option value="novo">Novo</option>
            <option value="confirmado">Confirmado</option>
            <option value="em_preparo">Em preparo</option>
            <option value="pronto">Pronto</option>
            <option value="em_entrega">Em entrega</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <TabelaBase carregando={carregando} vazio={pedidos.length === 0}>
          {pedidos.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-neutral-950 p-3">
              <div className="flex-1 min-w-[220px]">
                <div className="font-medium">#{p.numero_pedido} · {p.loja_nome}</div>
                <div className="text-xs text-white/60">
                  {p.cliente_nome} · {p.forma_pagamento} · {new Date(p.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase">{p.status}</span>
              <div className="text-right font-bold">R$ {Number(p.total).toFixed(2)}</div>
            </div>
          ))}
        </TabelaBase>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-white/80">Mercados</h3>
        <TabelaBase carregando={carregando} vazio={lojas.length === 0}>
          {lojas.map((l) => {
            const editing = edits[l.id] ?? String(l.comissao_percentual);
            const dirty = edits[l.id] !== undefined && Number(edits[l.id]) !== Number(l.comissao_percentual);
            return (
              <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-neutral-950 p-3">
                <div className="flex-1 min-w-[220px]">
                  <div className="font-medium">{l.nome}</div>
                  <div className="text-xs text-white/60">
                    {l.aberto ? "Aberto" : "Fechado"}{l.pausado ? " · pausado" : ""} · {l.pedidos_hoje} pedido(s) hoje · R$ {l.faturamento_hoje.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" step="0.5" min="0" max="100"
                    value={editing}
                    onChange={(e) => setEdits((es) => ({ ...es, [l.id]: e.target.value }))}
                    className="w-20 rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-sm"
                    aria-label={`Comissão de ${l.nome}`}
                  />
                  <span className="text-xs text-white/60">%</span>
                  <button
                    onClick={() => salvarComissao(l.id)}
                    disabled={!dirty}
                    className="ml-1 rounded-lg bg-[#00FF1A] px-3 py-1 text-xs font-semibold text-black disabled:opacity-30"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => alternarStatus(l, "pausado")}
                    className="ml-1 rounded-lg border border-white/20 bg-neutral-900 px-3 py-1 text-xs font-semibold text-white hover:bg-neutral-800"
                    title={l.pausado ? "Retomar pedidos" : "Pausar pedidos"}
                  >
                    {l.pausado ? "Retomar" : "Pausar"}
                  </button>
                  <button
                    onClick={() => alternarStatus(l, "ativo")}
                    className={`ml-1 rounded-lg px-3 py-1 text-xs font-semibold ${l.ativo ? "bg-red-600 text-white hover:bg-red-500" : "bg-white/10 text-white hover:bg-white/20"}`}
                    title={l.ativo ? "Bloquear loja" : "Reativar loja"}
                  >
                    {l.ativo ? "Bloquear" : "Reativar"}
                  </button>
                </div>
              </div>
            );
          })}
        </TabelaBase>
      </section>
    </div>
  );
}
