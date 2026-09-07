// Server functions — auditoria e ciência de uso da Mobilidade Urbana.
// Não se aplica ao fluxo de Logística de Envios.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LinhaAuditoria = {
  id: string;
  criada_em: string;
  aceita_em: string | null;
  iniciada_em: string | null;
  finalizada_em: string | null;
  servidor: string | null;
  cargo: string | null;
  lotacao: string | null;
  modalidade: string;
  status: string;
  origem: string | null;
  origem_lat: number | null;
  origem_lng: number | null;
  destino: string | null;
  destino_lat: number | null;
  destino_lng: number | null;
  distancia_km: number | null;
  duracao_min: number | null;
  motorista: string | null;
  fora_expediente: boolean;
  municipio_destino: string | null;
  com_excecao: boolean;
  perto_fronteira: boolean | null;
  total_registros: number;
};


function inicioDoDiaSaoPaulo(): string {
  const agora = new Date();
  const sp = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  sp.setHours(0, 0, 0, 0);
  // Converte o início do dia local (UTC-3) de volta para ISO absoluto.
  return new Date(sp.getTime() + 3 * 60 * 60 * 1000).toISOString();
}

/** Já existe aceite do aviso hoje (fuso America/Sao_Paulo)? */
export const cienciaMobilidadeHoje = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ aceito: boolean }> => {
    const { data, error } = await (context.supabase as any)
      .from("ride_acknowledgements")
      .select("id")
      .eq("user_id", context.userId)
      .gte("acknowledged_at", inicioDoDiaSaoPaulo())
      .limit(1);
    if (error) throw new Error(error.message);
    return { aceito: (data ?? []).length > 0 };
  });

/** Registra o aceite do aviso (data/hora, IP e navegador). */
export const registrarCienciaMobilidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ride_request_id?: string | null }) => ({
    ride_request_id: d?.ride_request_id ?? null,
  }))
  .handler(async ({ data, context }) => {
    const req = getRequest();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      null;
    const { error } = await (context.supabase as any).from("ride_acknowledgements").insert({
      user_id: context.userId,
      ride_request_id: data.ride_request_id,
      ip_address: ip,
      user_agent: req.headers.get("user-agent"),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- ADMIN ----------------

export const adminAuditoriaMobilidade = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      inicio?: string | null;
      fim?: string | null;
      busca?: string | null;
      status?: string | null;
      limite?: number;
      offset?: number;
    }) => d ?? {},
  )
  .handler(async ({ data, context }): Promise<LinhaAuditoria[]> => {
    const { data: rows, error } = await (context.supabase as any).rpc("admin_auditoria_mobilidade", {
      _inicio: data.inicio || null,
      _fim: data.fim || null,
      _busca: data.busca || null,
      _status: data.status || null,
      _limit: data.limite ?? 50,
      _offset: data.offset ?? 0,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as LinhaAuditoria[];
  });

export const adminAuditoriaRota = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { corrida_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any).rpc("admin_auditoria_rota", {
      _corrida_id: data.corrida_id,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{ lat: number; lng: number; recorded_at: string }>;
  });
