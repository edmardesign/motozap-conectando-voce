// Helpers de geometria no cliente: cache de 24h do polígono e teste ponto-dentro.
// A validação definitiva é sempre feita no banco (PostGIS); aqui é só UX.
import type { GeoJsonPolygon, MeuMunicipio } from "@/lib/municipios.functions";

const CACHE_KEY = "intergo.municipio.v1";
const TTL_MS = 24 * 60 * 60 * 1000;

export function lerCache(): MeuMunicipio | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw) as { at: number; data: MeuMunicipio };
    if (!at || Date.now() - at > TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

export function gravarCache(data: MeuMunicipio | null) {
  try {
    if (!data) localStorage.removeItem(CACHE_KEY);
    else localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* armazenamento indisponível — segue sem cache */
  }
}

/** Anéis externos de um Polygon/MultiPolygon em [lng, lat]. */
function aneis(geo: GeoJsonPolygon): number[][][] {
  if (!geo) return [];
  if (geo.type === "Polygon") return geo.coordinates as number[][][];
  return (geo.coordinates as number[][][][]).map((poly) => poly[0]!);
}

/** Converte para o formato do react-leaflet: [lat, lng]. */
export function poligonoParaLeaflet(geo: GeoJsonPolygon): [number, number][][] {
  return aneis(geo).map((ring) => ring.map(([lng, lat]) => [lat!, lng!] as [number, number]));
}

function dentroDoAnel(lat: number, lng: number, ring: number[][]): boolean {
  let dentro = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const cruza = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

export function pontoDentro(lat: number, lng: number, geo: GeoJsonPolygon | null | undefined): boolean {
  if (!geo) return true;
  return aneis(geo).some((ring) => dentroDoAnel(lat, lng, ring));
}

/** Ponto permitido: município de exercício ou qualquer vizinho liberado. */
export function pontoPermitido(lat: number, lng: number, mun: MeuMunicipio | null): boolean {
  if (!mun) return true;
  if (pontoDentro(lat, lng, mun.geojson)) return true;
  return (mun.vizinhos ?? []).some((v) => pontoDentro(lat, lng, v.geojson));
}

/** viewbox do Nominatim (left,top,right,bottom) para limitar o autocomplete. */
export function viewboxDe(mun: MeuMunicipio | null): string | null {
  const b = mun?.bounding_box;
  if (!b) return null;
  return `${b.minLng},${b.maxLat},${b.maxLng},${b.minLat}`;
}
