// Nominatim helpers — respeitando política de uso (1 req/s, identificação no Referer).
// Browsers não permitem setar User-Agent custom; usamos Referer implícito + parâmetro `email`.

const NOMINATIM = "https://nominatim.openstreetmap.org";
const DEFAULT_HEADERS = { Accept: "application/json", "Accept-Language": "pt-BR" };

let lastCall = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, 1000 - (now - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

export type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string | undefined>;
};

export function extractBairro(r: Partial<NominatimResult> | null | undefined): string | null {
  if (!r) return null;
  const a = r.address ?? {};
  const direct =
    a.suburb ?? a.neighbourhood ?? a.city_district ?? a.quarter ?? a.residential ?? null;
  if (direct) return direct;
  // Tenta extrair do display_name (2º ou 3º segmento)
  if (r.display_name) {
    const parts = r.display_name.split(",").map((s) => s.trim());
    if (parts.length >= 3) return parts[1] || parts[2] || null;
  }
  return null;
}

export async function geocodeAddress(query: string): Promise<NominatimResult | null> {
  if (!query.trim()) return null;
  await throttle();
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br&addressdetails=1`;
  try {
    const r = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!r.ok) return null;
    const arr = (await r.json()) as NominatimResult[];
    return arr[0] ?? null;
  } catch {
    return null;
  }
}

export async function geocodeFull(opts: {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
}): Promise<NominatimResult | null> {
  const { rua, numero, bairro, cidade, estado } = opts;
  const full = `${rua}, ${numero}, ${bairro}, ${cidade}, ${estado}, Brasil`;
  let hit = await geocodeAddress(full);
  if (hit) return hit;
  // Fallback: só bairro/cidade
  const simple = `${bairro}, ${cidade}, ${estado}, Brasil`;
  hit = await geocodeAddress(simple);
  return hit;
}

export async function reverseGeocode(lat: number, lng: number): Promise<NominatimResult | null> {
  await throttle();
  const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  try {
    const r = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!r.ok) return null;
    return (await r.json()) as NominatimResult;
  } catch {
    return null;
  }
}

export async function searchSuggestions(
  query: string,
  cidade: string,
  estado: string,
  /** viewbox "left,top,right,bottom" para restringir a busca ao município. */
  viewbox?: string | null,
): Promise<NominatimResult[]> {
  if (query.trim().length < 2) return [];
  await throttle();
  const q = `${query}, ${cidade}, ${estado}`;
  const limite = viewbox ? `&viewbox=${encodeURIComponent(viewbox)}&bounded=1` : "";
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=br&addressdetails=1${limite}`;
  try {
    const r = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!r.ok) return [];
    return (await r.json()) as NominatimResult[];
  } catch {
    return [];
  }
}

