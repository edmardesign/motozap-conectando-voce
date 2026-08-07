// Server functions do Painel Municipal (Rodada 2.C).
// Todas as leituras são filtradas automaticamente pelo RLS hierárquico
// (is_admin_principal / me_tem_permissao / cidade_id) — o servidor apenas
// aplica busca, paginação e o filtro opcional de cidade. Ações usam as
// RPCs SECURITY DEFINER já existentes (admin_aprovar_saque, admin_bloquear_empresa,
// admin_aprovar_empresa, admin_confirmar_pagamento_mototaxista, etc.), que
// verificam a permissão do chamador e registram auditoria.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PageInput = {
  cidade_id?: string | null;
  q?: string | null;
  status?: string | null;
  page?: number;
  page_size?: number;
};

type MotoPainelData = {
  id: string;
  status_cadastro: string | null;
  mensalidade_ativa: boolean | null;
  pagamento_confirmado: boolean | null;
  plano: string | null;
  plano_validade: string | null;
  total_corridas: number | null;
  cpf: string | null;
  numero_cnh: string | null;
  foto_selfie_cnh_url: string | null;
  foto_cnh_frente_url: string | null;
  foto_crlv_url: string | null;
  conta_bloqueada_comissao: boolean | null;
  atualizado_em: string | null;
};

type MototaxistaPainelRow = {
  id: string;
  nome: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  cidade_id: string | null;
  ativo: boolean;
  criado_em: string | null;
  moto: MotoPainelData;
};

const clampPage = (p?: number) => Math.max(1, Math.min(p ?? 1, 500));
const clampSize = (s?: number) => Math.max(5, Math.min(s ?? 20, 100));

/* =============== Passageiros =============== */
export const painelListarPassageiros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PageInput) => d)
  .handler(async ({ data, context }) => {
    const page = clampPage(data.page);
    const size = clampSize(data.page_size);
    const from = (page - 1) * size;
    let q = context.supabase
      .from("profiles")
      .select("id,nome,telefone,cidade,estado,cidade_id,ativo,criado_em", { count: "exact" })
      .eq("tipo", "passageiro")
      .order("criado_em", { ascending: false })
      .range(from, from + size - 1);
    if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
    if (data.q) {
      const s = data.q.replace(/\D/g, "");
      q = s.length >= 3
        ? q.or(`nome.ilike.%${data.q}%,telefone.ilike.%${s}%`)
        : q.ilike("nome", `%${data.q}%`);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page, size };
  });

/* =============== Mototaxistas =============== */
export const painelListarMototaxistas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PageInput) => d)
  .handler(async ({ data, context }) => {
    const page = clampPage(data.page);
    const size = clampSize(data.page_size);
    const from = (page - 1) * size;
    let q = (context.supabase as any)
      .from("mototaxistas")
      .select(
        "id,status_cadastro,mensalidade_ativa,pagamento_confirmado,plano,plano_validade,total_corridas,cpf,numero_cnh,foto_selfie_cnh_url,foto_cnh_frente_url,foto_crlv_url,conta_bloqueada_comissao,atualizado_em",
        { count: "exact" },
      )
      .order("atualizado_em", { ascending: false });
    if (data.status && data.status !== "todos") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      q = q.eq("status_cadastro", data.status as any);
    }
    const { data: motos, count, error } = await q;
    if (error) throw new Error(error.message);
    if (!motos || motos.length === 0) {
      return { rows: [] as MototaxistaPainelRow[], total: count ?? 0, page, size };
    }

    const motoRows = (motos ?? []) as MotoPainelData[];
    const ids = motoRows.map((m) => m.id);
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id,nome,telefone,cidade,estado,cidade_id,ativo,criado_em")
      .in("id", ids);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    let out: MototaxistaPainelRow[] = motoRows.map((m) => {
      const profile = profileMap.get(m.id) ?? {
        id: m.id,
        nome: "",
        telefone: "",
        cidade: null,
        estado: null,
        cidade_id: null,
        ativo: false,
        criado_em: null,
      };
      return { ...profile, moto: m };
    });
    if (data.cidade_id) out = out.filter((r) => r.cidade_id === data.cidade_id);
    if (data.q) {
      const termo = data.q.toLowerCase();
      const digits = data.q.replace(/\D/g, "");
      out = out.filter((r) =>
        String(r.nome ?? "").toLowerCase().includes(termo) ||
        (digits.length >= 3 && String(r.telefone ?? "").includes(digits)),
      );
    }
    const paged = out.slice(from, from + size);
    return { rows: paged, total: out.length, page, size };
  });

/* =============== Empresas =============== */
export const painelListarEmpresas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PageInput) => d)
  .handler(async ({ data, context }) => {
    const page = clampPage(data.page);
    const size = clampSize(data.page_size);
    const from = (page - 1) * size;
    let q = context.supabase
      .from("empresas")
      .select(
        "id,nome,telefone,documento,tipo_documento,cidade,estado,cidade_id,mensalidade_ativa,plano_validade,criado_em",
        { count: "exact" }
      )
      .order("criado_em", { ascending: false })
      .range(from, from + size - 1);
    if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
    if (data.q) q = q.ilike("nome", `%${data.q}%`);
    if (data.status === "ativas") q = q.eq("mensalidade_ativa", true);
    else if (data.status === "pendentes") q = q.eq("mensalidade_ativa", false);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page, size };
  });

/* =============== Corridas =============== */
export const painelListarCorridas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PageInput) => d)
  .handler(async ({ data, context }) => {
    const page = clampPage(data.page);
    const size = clampSize(data.page_size);
    const from = (page - 1) * size;
    let q = context.supabase
      .from("corridas")
      .select(
        "id,passageiro_id,mototaxista_id,origem_endereco,destino_endereco,valor_final,status,cidade_id,criado_em",
        { count: "exact" }
      )
      .order("criado_em", { ascending: false })
      .range(from, from + size - 1);
    if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
    if (data.status && data.status !== "todos") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      q = q.eq("status", data.status as any);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page, size };
  });

/* =============== Entregas =============== */
export const painelListarEntregas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PageInput) => d)
  .handler(async ({ data, context }) => {
    const page = clampPage(data.page);
    const size = clampSize(data.page_size);
    const from = (page - 1) * size;
    let q = context.supabase
      .from("entregas")
      .select(
        "id,empresa_id,mototaxista_id,coleta_endereco,entrega_endereco,valor,status,cidade_id,criado_em",
        { count: "exact" }
      )
      .order("criado_em", { ascending: false })
      .range(from, from + size - 1);
    if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
    if (data.status && data.status !== "todos") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      q = q.eq("status", data.status as any);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page, size };
  });

/* =============== Solicitações de saque =============== */
export const painelListarSaques = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PageInput) => d)
  .handler(async ({ data, context }) => {
    const page = clampPage(data.page);
    const size = clampSize(data.page_size);
    const from = (page - 1) * size;
    let q = context.supabase
      .from("solicitacoes_saque")
      .select(
        "id,mototaxista_id,valor,chave_pix,tipo,status,solicitado_em,processado_em,observacao",
        { count: "exact" }
      )
      .order("solicitado_em", { ascending: false })
      .range(from, from + size - 1);
    if (data.status && data.status !== "todos") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      q = q.eq("status", data.status as any);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { rows: [], total: count ?? 0, page, size };
    const ids = Array.from(new Set(rows.map((r) => r.mototaxista_id)));
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id,nome,telefone,cidade_id")
      .in("id", ids);
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
    let out = rows.map((r) => ({ ...r, moto: profMap.get(r.mototaxista_id) ?? null }));
    if (data.cidade_id) out = out.filter((r) => r.moto?.cidade_id === data.cidade_id);
    return { rows: out, total: count ?? 0, page, size };
  });

/* =============== Avaliações =============== */
export const painelListarAvaliacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PageInput) => d)
  .handler(async ({ data, context }) => {
    const page = clampPage(data.page);
    const size = clampSize(data.page_size);
    const from = (page - 1) * size;
    // avaliacoes é global; escopo por cidade acontece via corrida->cidade_id.
    let q = context.supabase
      .from("avaliacoes")
      .select("id,corrida_id,avaliador_id,avaliado_id,nota,comentario,criado_em", {
        count: "exact",
      })
      .order("criado_em", { ascending: false })
      .range(from, from + size - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { rows: [], total: count ?? 0, page, size };
    const corridaIds = Array.from(new Set(rows.map((r) => r.corrida_id)));
    const { data: corr } = await context.supabase
      .from("corridas")
      .select("id,cidade_id,origem_endereco,destino_endereco")
      .in("id", corridaIds);
    const cMap = new Map((corr ?? []).map((c) => [c.id, c]));
    let out = rows.map((r) => ({ ...r, corrida: cMap.get(r.corrida_id) ?? null }));
    if (data.cidade_id) out = out.filter((r) => r.corrida?.cidade_id === data.cidade_id);
    return { rows: out, total: count ?? 0, page, size };
  });

/* =============== KPIs por cidade selecionada =============== */
export const painelKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    async function count(
      table: "profiles" | "empresas" | "corridas" | "entregas",
      filters: Record<string, string> = {},
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase.from(table).select("id", { count: "exact", head: true });
      for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
      if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
      const { count } = await q;
      return count ?? 0;
    }
    const [passageiros, mototaxistas, empresas, corridas_hoje] = await Promise.all([
      count("profiles", { tipo: "passageiro" }),
      count("profiles", { tipo: "mototaxista" }),
      count("empresas"),
      // corridas hoje via .gte precisa de query direta
      (async () => {
        const inicio = new Date();
        inicio.setHours(0, 0, 0, 0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q: any = supabase
          .from("corridas")
          .select("id", { count: "exact", head: true })
          .gte("criado_em", inicio.toISOString());
        if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
        const { count } = await q;
        return count ?? 0;
      })(),
    ]);
    // Saques pendentes: solicitacoes_saque não tem cidade_id direta, contamos globalmente
    // (RLS já restringe por permissão do chamador).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sq: any = supabase
      .from("solicitacoes_saque")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente");
    const { count: saquesPend } = await sq;
    return {
      passageiros,
      mototaxistas,
      empresas,
      corridas_hoje,
      saques_pendentes: saquesPend ?? 0,
    };
  });

/* =============== AÇÕES (RPCs auditadas) =============== */
export const acaoAprovarMototaxista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { mototaxista_id: string; plano: "mensal" | "prata" | "ouro"; dias: number }) => d,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_confirmar_pagamento_mototaxista", {
      _id: data.mototaxista_id,
      _plano: data.plano,
      _dias: data.dias,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acaoBloquearPassageiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; ativo: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ ativo: data.ativo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acaoBloquearMototaxista = acaoBloquearPassageiro;

export const acaoAprovarEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { empresa_id: string; validade?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_aprovar_empresa", {
      _id: data.empresa_id,
      _validade: data.validade ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acaoBloquearEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { empresa_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_bloquear_empresa", {
      _id: data.empresa_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acaoAprovarSaque = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { saque_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_aprovar_saque", {
      _id: data.saque_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acaoConfirmarComissao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mototaxista_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_confirmar_pagamento_comissao", {
      _mototaxista_id: data.mototaxista_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* =============== FOOD (Fase 6) =============== */
export const painelFoodKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = context.supabase
      .from("food_pedidos")
      .select("id,status,subtotal,total,loja_id,cidade_id,created_at")
      .gte("created_at", inicio.toISOString());
    if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
    const { data: pedidos, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (pedidos ?? []) as Array<{ id: string; status: string; subtotal: number; total: number; loja_id: string }>;

    const lojasIds = Array.from(new Set(rows.map((r) => r.loja_id)));
    const comMap = new Map<string, number>();
    if (lojasIds.length) {
      const { data: lojas } = await context.supabase
        .from("food_lojas")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("id,comissao_percentual" as any)
        .in("id", lojasIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const l of (lojas ?? []) as any[]) comMap.set(l.id, Number(l.comissao_percentual ?? 0));
    }

    const porStatus: Record<string, number> = {};
    let faturamento = 0;
    let comissao = 0;
    for (const r of rows) {
      porStatus[r.status] = (porStatus[r.status] ?? 0) + 1;
      if (r.status !== "cancelado") {
        faturamento += Number(r.total ?? 0);
        const pct = comMap.get(r.loja_id) ?? 0;
        comissao += (Number(r.subtotal ?? 0) * pct) / 100;
      }
    }
    const validos = rows.filter((r) => r.status !== "cancelado");
    const ticket = validos.length ? faturamento / validos.length : 0;
    return {
      total: rows.length,
      por_status: porStatus,
      faturamento: Number(faturamento.toFixed(2)),
      comissao: Number(comissao.toFixed(2)),
      ticket_medio: Number(ticket.toFixed(2)),
    };
  });

export const painelFoodListarPedidos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PageInput) => d)
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = context.supabase
      .from("food_pedidos")
      .select("id,numero_pedido,status,total,forma_pagamento,loja_id,cliente_user_id,cidade_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
    if (data.status && data.status !== "todos") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Array<{ loja_id: string; cliente_user_id: string }>;
    const lojaIds = Array.from(new Set(list.map((r) => r.loja_id)));
    const clienteIds = Array.from(new Set(list.map((r) => r.cliente_user_id)));
    const [{ data: lojas }, { data: clientes }] = await Promise.all([
      lojaIds.length
        ? context.supabase.from("food_lojas").select("id,nome").in("id", lojaIds)
        : Promise.resolve({ data: [] as Array<{ id: string; nome: string }> }),
      clienteIds.length
        ? context.supabase.from("profiles").select("id,nome").in("id", clienteIds)
        : Promise.resolve({ data: [] as Array<{ id: string; nome: string }> }),
    ]);
    const lojaMap = new Map((lojas ?? []).map((l) => [l.id, l.nome]));
    const cliMap = new Map((clientes ?? []).map((c) => [c.id, c.nome]));
    return {
      rows: (rows ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        loja_nome: lojaMap.get(r.loja_id as string) ?? "—",
        cliente_nome: cliMap.get(r.cliente_user_id as string) ?? "—",
      })),
    };
  });

export const painelFoodListarLojas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id?: string | null }) => d)
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = context.supabase
      .from("food_lojas")
      .select("id,nome,cidade_id,aberto,pausado,ativo,comissao_percentual" as any)
      .order("nome");
    if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
    const { data: lojas, error } = await q;
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = (lojas ?? []) as any[];
    if (list.length === 0) return { rows: [] };

    const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
    const ids = list.map((l) => l.id);
    const { data: peds } = await context.supabase
      .from("food_pedidos")
      .select("loja_id,total,status")
      .in("loja_id", ids)
      .gte("created_at", inicio.toISOString());
    const agg = new Map<string, { pedidos: number; faturamento: number }>();
    for (const p of (peds ?? []) as Array<{ loja_id: string; total: number; status: string }>) {
      const a = agg.get(p.loja_id) ?? { pedidos: 0, faturamento: 0 };
      a.pedidos += 1;
      if (p.status !== "cancelado") a.faturamento += Number(p.total ?? 0);
      agg.set(p.loja_id, a);
    }
    return {
      rows: list.map((l) => ({
        ...l,
        pedidos_hoje: agg.get(l.id)?.pedidos ?? 0,
        faturamento_hoje: Number((agg.get(l.id)?.faturamento ?? 0).toFixed(2)),
      })),
    };
  });

export const acaoFoodDefinirComissao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { loja_id: string; percentual: number }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_food_definir_comissao" as never, {
      _loja_id: data.loja_id,
      _percentual: data.percentual,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acaoFoodDefinirStatusLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { loja_id: string; ativo: boolean; pausado: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_food_definir_status_loja" as never, {
      _loja_id: data.loja_id,
      _ativo: data.ativo,
      _pausado: data.pausado,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


/* =============== MERCADO (Fase 6) =============== */
export const painelMercadoKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = context.supabase
      .from("mercado_pedidos")
      .select("id,status,subtotal,total,loja_id,cidade_id,created_at")
      .gte("created_at", inicio.toISOString());
    if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
    const { data: pedidos, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (pedidos ?? []) as Array<{ id: string; status: string; subtotal: number; total: number; loja_id: string }>;

    const lojasIds = Array.from(new Set(rows.map((r) => r.loja_id)));
    const comMap = new Map<string, number>();
    if (lojasIds.length) {
      const { data: lojas } = await context.supabase
        .from("mercado_lojas")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("id,comissao_percentual" as any)
        .in("id", lojasIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const l of (lojas ?? []) as any[]) comMap.set(l.id, Number(l.comissao_percentual ?? 0));
    }

    const porStatus: Record<string, number> = {};
    let faturamento = 0;
    let comissao = 0;
    for (const r of rows) {
      porStatus[r.status] = (porStatus[r.status] ?? 0) + 1;
      if (r.status !== "cancelado") {
        faturamento += Number(r.total ?? 0);
        const pct = comMap.get(r.loja_id) ?? 0;
        comissao += (Number(r.subtotal ?? 0) * pct) / 100;
      }
    }
    const validos = rows.filter((r) => r.status !== "cancelado");
    const ticket = validos.length ? faturamento / validos.length : 0;
    return {
      total: rows.length,
      por_status: porStatus,
      faturamento: Number(faturamento.toFixed(2)),
      comissao: Number(comissao.toFixed(2)),
      ticket_medio: Number(ticket.toFixed(2)),
    };
  });

export const painelMercadoListarPedidos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PageInput) => d)
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = context.supabase
      .from("mercado_pedidos")
      .select("id,numero_pedido,status,total,forma_pagamento,loja_id,cliente_user_id,cidade_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
    if (data.status && data.status !== "todos") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Array<{ loja_id: string; cliente_user_id: string }>;
    const lojaIds = Array.from(new Set(list.map((r) => r.loja_id)));
    const clienteIds = Array.from(new Set(list.map((r) => r.cliente_user_id)));
    const [{ data: lojas }, { data: clientes }] = await Promise.all([
      lojaIds.length
        ? context.supabase.from("mercado_lojas").select("id,nome").in("id", lojaIds)
        : Promise.resolve({ data: [] as Array<{ id: string; nome: string }> }),
      clienteIds.length
        ? context.supabase.from("profiles").select("id,nome").in("id", clienteIds)
        : Promise.resolve({ data: [] as Array<{ id: string; nome: string }> }),
    ]);
    const lojaMap = new Map((lojas ?? []).map((l) => [l.id, l.nome]));
    const cliMap = new Map((clientes ?? []).map((c) => [c.id, c.nome]));
    return {
      rows: (rows ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        loja_nome: lojaMap.get(r.loja_id as string) ?? "—",
        cliente_nome: cliMap.get(r.cliente_user_id as string) ?? "—",
      })),
    };
  });

export const painelMercadoListarLojas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id?: string | null }) => d)
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = context.supabase
      .from("mercado_lojas")
      .select("id,nome,cidade_id,aberto,pausado,ativo,comissao_percentual" as any)
      .order("nome");
    if (data.cidade_id) q = q.eq("cidade_id", data.cidade_id);
    const { data: lojas, error } = await q;
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = (lojas ?? []) as any[];
    if (list.length === 0) return { rows: [] };

    const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
    const ids = list.map((l) => l.id);
    const { data: peds } = await context.supabase
      .from("mercado_pedidos")
      .select("loja_id,total,status")
      .in("loja_id", ids)
      .gte("created_at", inicio.toISOString());
    const agg = new Map<string, { pedidos: number; faturamento: number }>();
    for (const p of (peds ?? []) as Array<{ loja_id: string; total: number; status: string }>) {
      const a = agg.get(p.loja_id) ?? { pedidos: 0, faturamento: 0 };
      a.pedidos += 1;
      if (p.status !== "cancelado") a.faturamento += Number(p.total ?? 0);
      agg.set(p.loja_id, a);
    }
    return {
      rows: list.map((l) => ({
        ...l,
        pedidos_hoje: agg.get(l.id)?.pedidos ?? 0,
        faturamento_hoje: Number((agg.get(l.id)?.faturamento ?? 0).toFixed(2)),
      })),
    };
  });

export const acaoMercadoDefinirComissao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { loja_id: string; percentual: number }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_mercado_definir_comissao" as never, {
      _loja_id: data.loja_id,
      _percentual: data.percentual,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acaoMercadoDefinirStatusLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { loja_id: string; ativo: boolean; pausado: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_mercado_definir_status_loja" as never, {
      _loja_id: data.loja_id,
      _ativo: data.ativo,
      _pausado: data.pausado,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
