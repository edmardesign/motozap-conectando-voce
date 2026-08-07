// Server functions — Gestão de Tarifas Bora Zé!
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Leitura ----------
export const listarConfiguracoesTarifarias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("configuracoes_tarifarias")
      .select("*")
      .order("cidade_id", { ascending: true, nullsFirst: true })
      .order("inicio_vigencia", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listarBairros = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: bairros, error } = await (context.supabase as any)
      .from("bairros")
      .select("id, cidade_id, nome, nome_normalizado, aliases, ativo")
      .eq("cidade_id", data.cidade_id)
      .order("nome");
    if (error) throw new Error(error.message);
    return bairros ?? [];
  });

export const listarRegrasPreco = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: regras, error } = await (context.supabase as any)
      .from("regras_preco_bairro")
      .select("*")
      .eq("cidade_id", data.cidade_id)
      .order("prioridade");
    if (error) throw new Error(error.message);
    return regras ?? [];
  });

// ---------- Escrita: chama RPCs seguras ----------
export const definirTaxaGlobal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { taxa: number; justificativa: string; inicio_vigencia?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { data: id, error } = await (context.supabase as any).rpc("admin_definir_taxa_global", {
      _taxa: data.taxa,
      _justificativa: data.justificativa,
      _inicio_vigencia: data.inicio_vigencia ?? null,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export const definirTaxaCidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id: string; taxa: number; valor_base: number; justificativa: string; inicio_vigencia?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { data: id, error } = await (context.supabase as any).rpc("admin_definir_taxa_cidade", {
      _cidade_id: data.cidade_id,
      _taxa: data.taxa,
      _valor_base: data.valor_base,
      _justificativa: data.justificativa,
      _inicio_vigencia: data.inicio_vigencia ?? null,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export const cadastrarBairro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id: string; nome: string; aliases?: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { data: id, error } = await (context.supabase as any).rpc("gestor_cadastrar_bairro", {
      _cidade_id: data.cidade_id,
      _nome: data.nome,
      _aliases: data.aliases ?? [],
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export const editarBairro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; nome?: string | null; aliases?: string[] | null; ativo?: boolean | null }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("gestor_editar_bairro", {
      _id: data.id,
      _nome: data.nome ?? null,
      _aliases: data.aliases ?? null,
      _ativo: data.ativo ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const criarRegraPreco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    cidade_id: string;
    bairro_origem_id: string | null;
    bairro_destino_id: string | null;
    tipo_aplicacao: "origem" | "destino" | "origem_ou_destino" | "rota";
    valor_base: number;
    prioridade: number;
    justificativa: string;
    inicio_vigencia?: string | null;
    fim_vigencia?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const { data: id, error } = await (context.supabase as any).rpc("gestor_criar_regra_preco_bairro", {
      _cidade_id: data.cidade_id,
      _bairro_origem_id: data.bairro_origem_id,
      _bairro_destino_id: data.bairro_destino_id,
      _tipo_aplicacao: data.tipo_aplicacao,
      _valor_base: data.valor_base,
      _prioridade: data.prioridade,
      _justificativa: data.justificativa,
      _inicio_vigencia: data.inicio_vigencia ?? null,
      _fim_vigencia: data.fim_vigencia ?? null,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export const ativarRegraPreco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; ativo: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("gestor_ativar_regra_preco_bairro", {
      _id: data.id,
      _ativo: data.ativo,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const previewCalculo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cidade_id: string; bairro_origem_id?: string | null; bairro_destino_id?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { data: r, error } = await (context.supabase as any).rpc("calcular_preco_corrida", {
      _cidade_id: data.cidade_id,
      _bairro_origem_id: data.bairro_origem_id ?? null,
      _bairro_destino_id: data.bairro_destino_id ?? null,
    });
    if (error) throw new Error(error.message);
    return (r && r[0]) || null;
  });
