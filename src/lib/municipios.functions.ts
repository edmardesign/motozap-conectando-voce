// Server functions — restrição geográfica por município (SaaS multi-tenant).
// Toda a validação real acontece no banco (PostGIS); aqui só expomos os dados.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GeoJsonPolygon = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

export type MunicipioResumo = {
  id: string;
  name: string;
  uf: string;
  geojson: GeoJsonPolygon;
};

export type MeuMunicipio = {
  id: string;
  ibge_code: string;
  name: string;
  uf: string;
  geojson: GeoJsonPolygon;
  centroid_lat: number;
  centroid_lng: number;
  bounding_box: { minLat: number; minLng: number; maxLat: number; maxLng: number };
  vizinhos: MunicipioResumo[];
};

/** Município de exercício do servidor autenticado + vizinhos liberados pela prefeitura. */
export const meuMunicipio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MeuMunicipio | null> => {
    const { data, error } = await (context.supabase as any).rpc("mun_meu_municipio");
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      id: row.id,
      ibge_code: row.ibge_code,
      name: row.name,
      uf: row.uf,
      geojson: row.geojson,
      centroid_lat: Number(row.centroid_lat),
      centroid_lng: Number(row.centroid_lng),
      bounding_box: row.bounding_box,
      vizinhos: (row.vizinhos ?? []) as MunicipioResumo[],
    };
  });

/** Lista de municípios cadastrados (para seletores). */
export const listarMunicipios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("municipalities")
      .select("id,name,uf,ibge_code")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ id: string; name: string; uf: string; ibge_code: string }>;
  });

// ---------------- EXCEÇÕES INTERMUNICIPAIS ----------------

export type ExcecaoServidor = {
  id: string;
  requested_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  consumed_at: string | null;
  created_at: string;
  cidade: string | null;
};

/** Servidor solicita autorização para deslocamento fora do município. */
export const solicitarExcecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { municipio_id: string; motivo: string; data: string }) => {
    const motivo = (d?.motivo ?? "").trim();
    if (!d?.municipio_id) throw new Error("Selecione o município de destino.");
    if (motivo.length < 5) throw new Error("Descreva o motivo do deslocamento.");
    if (!d?.data) throw new Error("Informe a data prevista.");
    return { municipio_id: d.municipio_id, motivo: motivo.slice(0, 800), data: d.data };
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("ride_exception_requests").insert({
      user_id: context.userId,
      requested_city_id: data.municipio_id,
      reason: data.motivo,
      requested_date: data.data,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Autorizações do próprio servidor. */
export const minhasExcecoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExcecaoServidor[]> => {
    const { data, error } = await (context.supabase as any)
      .from("ride_exception_requests")
      .select("id,requested_date,reason,status,consumed_at,created_at,municipalities(name)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      requested_date: r.requested_date,
      reason: r.reason,
      status: r.status,
      consumed_at: r.consumed_at,
      created_at: r.created_at,
      cidade: r.municipalities?.name ?? null,
    }));
  });

// ---------------- ADMIN ----------------

export type ExcecaoAdmin = {
  id: string;
  criada_em: string;
  servidor: string | null;
  cargo: string | null;
  lotacao: string | null;
  cidade: string;
  uf: string;
  reason: string;
  requested_date: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  notes: string | null;
  consumed_at: string | null;
};

export const adminListarExcecoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string | null }) => ({ status: d?.status || null }))
  .handler(async ({ data, context }): Promise<ExcecaoAdmin[]> => {
    const { data: rows, error } = await (context.supabase as any).rpc("admin_excecoes_listar", {
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as ExcecaoAdmin[];
  });

export const adminDecidirExcecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; aprovar: boolean; notas?: string }) => ({
    id: d.id,
    aprovar: !!d.aprovar,
    notas: (d?.notas ?? "").slice(0, 500) || null,
  }))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("admin_excecao_decidir", {
      _id: data.id,
      _aprovar: data.aprovar,
      _notas: data.notas,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type VizinhoConfig = {
  id: string;
  primary_city_id: string;
  neighbor_city_id: string;
  neighbor_name: string;
  neighbor_uf: string;
};

export const adminListarVizinhos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { municipio_id: string }) => d)
  .handler(async ({ data, context }): Promise<VizinhoConfig[]> => {
    const { data: rows, error } = await (context.supabase as any)
      .from("allowed_neighbor_cities")
      .select("id,primary_city_id,neighbor_city_id,municipalities!allowed_neighbor_cities_neighbor_city_id_fkey(name,uf)")
      .eq("primary_city_id", data.municipio_id);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      primary_city_id: r.primary_city_id,
      neighbor_city_id: r.neighbor_city_id,
      neighbor_name: r.municipalities?.name ?? "—",
      neighbor_uf: r.municipalities?.uf ?? "",
    }));
  });

export const adminAlterarVizinho = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { primary_id: string; neighbor_id: string; remover?: boolean }) => ({
    primary_id: d.primary_id,
    neighbor_id: d.neighbor_id,
    remover: !!d.remover,
  }))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("admin_municipio_vizinho", {
      _primary: data.primary_id,
      _neighbor: data.neighbor_id,
      _remover: data.remover,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
