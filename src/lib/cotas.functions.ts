// Server functions — Cota mensal de Mobilidade Urbana (serviço público, sem cobrança)
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CotaMensal = {
  month: string;
  limite: number;
  used: number;
  extra_granted: number;
  restantes: number;
};

/** Cota do mês corrente do usuário autenticado (cria o registro se não existir). */
export const minhaCotaMobilidade = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CotaMensal> => {
    const { data, error } = await (context.supabase as any).rpc("mob_minha_cota");
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return {
      month: row?.month ?? "",
      limite: Number(row?.limite ?? 0),
      used: Number(row?.used ?? 0),
      extra_granted: Number(row?.extra_granted ?? 0),
      restantes: Number(row?.restantes ?? 0),
    };
  });

/** Servidor pede liberação extra ao gestor (motivo opcional). */
export const solicitarLiberacaoCota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { motivo?: string }) => ({ motivo: (d?.motivo ?? "").slice(0, 500) }))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("quota_requests")
      .insert({ user_id: context.userId, reason: data.motivo });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Histórico de chamadas de mobilidade do próprio usuário. */
export const minhasChamadasMobilidade = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("corridas")
      .select("id,created_at,tipo,status,origem_endereco,destino_endereco")
      .eq("passageiro_id", context.userId)
      .in("tipo", ["automovel", "moto_taxi"])
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      created_at: string;
      tipo: string;
      status: string;
      origem_endereco: string | null;
      destino_endereco: string | null;
    }>;
  });

// ---------------- ADMIN ----------------

export const adminListarCotas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { month?: string | null; busca?: string | null }) => d ?? {})
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any).rpc("admin_listar_cotas", {
      _month: data.month ?? null,
      _busca: data.busca ?? null,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      user_id: string;
      nome: string | null;
      cidade: string | null;
      month: string;
      limite: number;
      used: number;
      extra_granted: number;
      restantes: number;
    }>;
  });

export const adminLiberarCotaExtra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; amount: number; motivo?: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("admin_liberar_cota_extra", {
      _user_id: data.user_id,
      _amount: Math.trunc(data.amount),
      _reason: data.motivo ?? "",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDefinirLimiteMobilidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limite: number }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("admin_definir_limite_mobilidade", {
      _limit: Math.trunc(data.limite),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminChamadasMobilidadeMes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { month?: string | null }) => d ?? {})
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any).rpc(
      "admin_listar_corridas_mobilidade",
      { _month: data.month ?? null },
    );
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      criada_em: string;
      passageiro: string | null;
      tipo: string;
      status: string;
      origem: string | null;
      destino: string | null;
    }>;
  });

export const adminPedidosLiberacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("quota_requests")
      .select("id,user_id,month,reason,status,created_at")
      .eq("status", "pendente")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      user_id: string;
      month: string;
      reason: string;
      status: string;
      created_at: string;
    }>;
  });
