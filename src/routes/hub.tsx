import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PassageiroTabBar } from "@/components/passageiro-tab-bar";
import { ChatCorrida, ChatFab } from "@/components/chat-corrida";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  MapPin,
  Navigation,
  FileText,
  Stethoscope,
  Pill,
  Package,
  Star,
  Phone,
  X,
  Search,
  Loader2,
  Crosshair,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Circle, Polyline, Popup, useMap } from "react-leaflet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { formatBRL, whatsappLink } from "@/lib/pricing";
import { formatarPlaca, formatarTelefone } from "@/utils/formatters";
import {
  searchSuggestions,
  reverseGeocode,
  extractBairro,
  type NominatimResult,
} from "@/lib/geocoding";
import { EmojiIcon } from "@/components/emoji-icon";
import logoIntergo from "@/assets/intergo-logo-white.png.asset.json";

import { z } from "zod";

const hubSearchSchema = z.object({
  tipo: z.enum(["automovel", "moto_taxi", "documentos", "exames", "medicamentos", "encomendas"]).optional(),
  id_demanda: z.string().optional(),
});

export const Route = createFileRoute("/hub")({
  validateSearch: (search) => hubSearchSchema.parse(search),
  component: PassageiroHomePage,
  ssr: false,
});

// ===== Types =====
type Profile = {
  id: string;
  nome: string;
  telefone: string;
  cidade: string | null;
  estado: string | null;
};
type Bairro = { id: string; nome_bairro: string; valor_adicional: number };
type DestinoUsuario = {
  id: string;
  nome: string | null;
  endereco: string;
  latitude: number | null;
  longitude: number | null;
  favorito: boolean;
  vezes_usado: number;
  ultima_vez_usado: string;
};
type Corrida = {
  id: string;
  status: "aguardando" | "aceita" | "em_andamento" | "concluida" | "cancelada";
  mototaxista_id: string | null;
  origem_endereco: string;
  destino_endereco: string;
  valor_estimado: number;
  valor_final: number | null;
  eh_gratuita: boolean;
};
type MotoOnline = {
  id: string;
  nome: string | null;
  foto_url: string | null;
  modelo_moto: string | null;
  placa_moto: string | null;
  latitude: number;
  longitude: number;
};
type Theme = "dark" | "light";
type Step =
  | "setup"
  | "waiting"
  | "assigned"
  | "arrived"
  | "in_progress"
  | "rate"
  | "done";

// ===== Palette (WhatsApp-style) =====
type Palette = {
  bg: string; panel: string; headerBg: string; cardBg: string; inputBg: string;
  text: string; textMuted: string; sysBubble: string; userBubble: string;
  btn: string; btnText: string; divider: string;
};
const INSTITUCIONAL: Palette = {
  bg: "#FFFFFF", panel: "#FFFFFF", headerBg: "#FFFFFF", cardBg: "#F7F7F7", inputBg: "#FFFFFF",
  text: "#111111", textMuted: "#6B6B6B", sysBubble: "#F7F7F7", userBubble: "#E7F6E9",
  btn: "#3DB54A", btnText: "#FFFFFF", divider: "#E8E8E8",
};
const PALETTES: Record<Theme, Palette> = { dark: INSTITUCIONAL, light: INSTITUCIONAL };

// ===== Demandas de logística institucional =====
type TipoDemanda = "documentos" | "exames" | "medicamentos" | "encomendas";
const TIPOS_DEMANDA: { id: TipoDemanda; label: string; Icon: typeof FileText }[] = [
  { id: "documentos", label: "Documentos", Icon: FileText },
  { id: "exames", label: "Exames", Icon: Stethoscope },
  { id: "medicamentos", label: "Medicamentos", Icon: Pill },
  { id: "encomendas", label: "Encomendas", Icon: Package },
];

// ===== Órgãos / unidades pré-definidos do município =====
const ORGAOS: string[] = [
  "Prefeitura",
  "PSF Bombinha",
  "PSF Tiracol",
  "PSF Coqueiro",
  "PSF Riacho",
  "UPA",
  "Secretaria de Saúde",
  "Secretaria de Esporte",
  "Secretaria de Transporte",
  "Tributos",
  "Finanças",
  "Anexo",
  "Posto de Saúde",
];

// ===== Map icon helpers =====
function emojiIcon(emoji: string, size = 38, ring?: string) {
  const html = `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:#ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);font-size:${size * 0.55}px;line-height:1;${
    ring ? `border:3px solid ${ring};` : ""
  }">${emoji}</div>`;
  return L.divIcon({
    html,
    className: "mz-emoji-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapRecenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom() < 14 ? 15 : map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [points, map]);
  return null;
}

function matchBairro(bairros: { nome_bairro: string }[], raw: string | null): string | null {
  if (!raw) return null;
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const target = norm(raw);
  const exact = bairros.find((b) => norm(b.nome_bairro) === target);
  if (exact) return exact.nome_bairro;
  const partial = bairros.find(
    (b) => target.includes(norm(b.nome_bairro)) || norm(b.nome_bairro).includes(target),
  );
  return partial?.nome_bairro ?? null;
}

async function reverseToAddress(lat: number, lng: number) {
  const r = await reverseGeocode(lat, lng);
  if (!r) return { display: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, bairro: null as string | null };
  const a = r.address ?? {};
  const rua = a.road ?? a.pedestrian ?? a.suburb ?? "";
  const num = a.house_number ?? "";
  const bairro = extractBairro(r);
  const partes = [rua && num ? `${rua}, ${num}` : rua, bairro].filter(Boolean);
  const display = partes.join(" — ") || r.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return { display, bairro };
}

// ===== Component =====
function PassageiroHomePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const geo = useGeolocation();

  const [tipoDemanda, setTipoDemanda] = useState<TipoDemanda | null>(
    (search.tipo && ["documentos", "exames", "medicamentos", "encomendas"].includes(search.tipo) 
      ? search.tipo as TipoDemanda 
      : null)
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Paleta institucional única (branco predominante, verde só em ações)
  const c = INSTITUCIONAL;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [cidadeId, setCidadeId] = useState<string | null>(null);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [contadorBrinde, setContadorBrinde] = useState(0);

  // fluxo institucional (coleta/entrega em órgãos)
  const [origemModo, setOrigemModo] = useState<"orgao" | "outro">("orgao");
  const [orgaoOrigem, setOrgaoOrigem] = useState<string | null>(null);
  const [entregaModo, setEntregaModo] = useState<"meu_endereco" | "orgao" | "outro">("orgao");
  const [orgaoDestino, setOrgaoDestino] = useState<string | null>(null);
  const [salaEntrega, setSalaEntrega] = useState("");
  const [responsavelEntrega, setResponsavelEntrega] = useState("");
  const [meuEndereco, setMeuEndereco] = useState<{
    display: string;
    coords: { lat: number; lng: number };
    bairro: string | null;
  } | null>(null);
  const [buscandoOrgaoOrigem, setBuscandoOrgaoOrigem] = useState<string | null>(null);

  // origem
  const [origem, setOrigem] = useState("");
  const [origemCoords, setOrigemCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [bairroOrigem, setBairroOrigem] = useState<string | null>(null);
  const [detectingOrigin, setDetectingOrigin] = useState(false);
  const [origemFocused, setOrigemFocused] = useState(false);
  const [origemSug, setOrigemSug] = useState<NominatimResult[]>([]);
  const [searchingOrigem, setSearchingOrigem] = useState(false);

  // destino
  const [destino, setDestino] = useState("");
  const [destinoCoords, setDestinoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [bairroDestino, setBairroDestino] = useState<string | null>(null);
  const [destFocused, setDestFocused] = useState(false);
  const [destSug, setDestSug] = useState<NominatimResult[]>([]);
  const [destinos, setDestinos] = useState<DestinoUsuario[]>([]);
  const [searchingDest, setSearchingDest] = useState(false);
  const [buscandoLugar, setBuscandoLugar] = useState<string | null>(null);

  // Modo de solicitação: corrida normal ou "Pegue Ali" (favor/erranda)
  const [mode, setMode] = useState<"corrida" | "pegue_ali">("corrida");
  const [observacao, setObservacao] = useState("");
  const [pegueDescricao, setPegueDescricao] = useState("");
  const [pegueFoto, setPegueFoto] = useState<File | null>(null);
  const [pegueFotoPreview, setPegueFotoPreview] = useState<string | null>(null);
  const [peguePagamento, setPeguePagamento] = useState<"pago" | "na_hora" | null>(null);
  const [pegueValorLocal, setPegueValorLocal] = useState("");
  const [pegueEmNomeDe, setPegueEmNomeDe] = useState("");
  const [pegueSubmitting, setPegueSubmitting] = useState(false);

  // tarifa
  const [tarifaInfo, setTarifaInfo] = useState<{
    valor: number;
    adicional: number;
    total: number;
    nome: string;
  } | null>(null);
  const [calculatingTarifa, setCalculatingTarifa] = useState(false);

  // corrida
  const [step, setStep] = useState<Step>("setup");
  const [corrida, setCorrida] = useState<Corrida | null>(null);
  const [motoInfo, setMotoInfo] = useState<{
    id: string;
    nome: string;
    telefone: string;
    foto_url: string | null;
    plano: string | null;
    moto_modelo: string | null;
    moto_placa: string | null;
    nota_media: number | null;
    latitude: number | null;
    longitude: number | null;
  } | null>(null);
  const [chegou, setChegou] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");

  // mototaxistas online no mapa
  const [motosOnline, setMotosOnline] = useState<MotoOnline[]>([]);
  const [motosLoaded, setMotosLoaded] = useState(false);

  // rota OSRM
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  // popup "sem mototaxistas"
  const [showNoDrivers, setShowNoDrivers] = useState(false);
  const [noDriversReason, setNoDriversReason] = useState<"initial" | "timeout">("initial");

  // ----- Auth gate -----
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth/passageiro" });
  }, [authLoading, user, navigate]);

  // ----- Load profile, cidade, bairros, contador, favoritos -----
  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      const [pRes, cRes, fRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,nome,telefone,cidade,estado")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("contador_corridas_passageiro")
          .select("corridas_desde_ultimo_brinde")
          .eq("passageiro_id", user.id)
          .maybeSingle(),
        supabase
          .from("destinos_passageiro" as any)
          .select("id,nome,endereco,latitude,longitude,favorito,vezes_usado,ultima_vez_usado")
          .eq("passageiro_id", user.id)
          .order("favorito", { ascending: false })
          .order("ultima_vez_usado", { ascending: false })
          .limit(5),
      ]);
      if (cancel) return;
      if (pRes.data) setProfile(pRes.data as Profile);
      if (cRes.data)
        setContadorBrinde((cRes.data as any).corridas_desde_ultimo_brinde ?? 0);
      if (fRes.data) setDestinos(fRes.data as unknown as DestinoUsuario[]);
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  useEffect(() => {
    if (!profile?.cidade || !profile.estado) return;
    let cancel = false;
    (async () => {
      const { data: city } = await (supabase as any)
        .from("cidades_configuradas")
        .select("id")
        .eq("estado", profile.estado)
        .ilike("cidade", profile.cidade!)
        .eq("ativa", true)
        .maybeSingle();
      if (cancel) return;
      if (!city) {
        setCidadeId(null);
        return;
      }
      setCidadeId(city.id);
      const { data: bs } = await (supabase as any)
        .from("bairros_adicional")
        .select("id,nome_bairro,valor_adicional")
        .eq("cidade_id", city.id)
        .eq("ativo", true);
      if (!cancel) setBairros((bs ?? []) as Bairro[]);
    })();
    return () => {
      cancel = true;
    };
  }, [profile?.cidade, profile?.estado]);

  // ----- Detectar localização inicial automaticamente -----
  const detectOrigin = useCallback(async () => {
    setDetectingOrigin(true);
    try {
      const coords = await geo.request();
      if (!coords) {
        toast.error("Não consegui acessar sua localização. Permita o GPS ou digite o endereço.");
        return;
      }
      setOrigemCoords(coords);
      const { display, bairro } = await reverseToAddress(coords.lat, coords.lng);
      setOrigem(display);
      setBairroOrigem(matchBairro(bairros, bairro));
      setOrigemModo("outro");
      setOrgaoOrigem(null);
      setMeuEndereco({ display, coords, bairro: matchBairro(bairros, bairro) });
    } finally {
      setDetectingOrigin(false);
    }
  }, [geo, bairros]);

  const autoDetectedRef = useRef(false);
  useEffect(() => {
    if (autoDetectedRef.current) return;
    if (!profile) return;
    autoDetectedRef.current = true;
    detectOrigin();
  }, [profile, detectOrigin]);

  // ----- Mototaxistas online (mesma cidade) realtime -----
  useEffect(() => {
    if (!profile?.cidade || !profile.estado || step !== "setup") return;
    let cancel = false;
    const fetchOnline = async () => {
      const { data } = await (supabase as any).rpc("get_mototaxistas_online_cidade", {
        _estado: profile.estado,
        _cidade: profile.cidade,
      });
      if (cancel || !data) return;
      const filtered: MotoOnline[] = (data as any[])
        .filter((m) => m.latitude && m.longitude)
        .map((m) => ({
          id: m.id,
          nome: m.nome ?? null,
          foto_url: m.foto_url ?? null,
          modelo_moto: m.modelo_moto ?? null,
          placa_moto: m.placa_moto ?? null,
          latitude: Number(m.latitude),
          longitude: Number(m.longitude),
        }));
      setMotosOnline(filtered);
      setMotosLoaded(true);
    };
    fetchOnline();
    const ch = supabase
      .channel("mototaxistas-online")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mototaxistas" },
        fetchOnline,
      )
      .subscribe();
    const id = setInterval(fetchOnline, 15000);
    return () => {
      cancel = true;
      clearInterval(id);
      supabase.removeChannel(ch);
    };
  }, [profile?.cidade, profile?.estado, step]);

  // ----- OSRM: rota entre origem e destino -----
  useEffect(() => {
    if (!origemCoords || !destinoCoords) {
      setRouteCoords([]);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${origemCoords.lng},${origemCoords.lat};${destinoCoords.lng},${destinoCoords.lat}` +
          `?overview=full&geometries=geojson`;
        const r = await fetch(url);
        if (!r.ok) return;
        const j = await r.json();
        const coords = j?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
        if (cancel || !coords) return;
        setRouteCoords(coords.map(([lng, lat]) => [lat, lng]));
      } catch {
        if (!cancel) setRouteCoords([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [origemCoords?.lat, origemCoords?.lng, destinoCoords?.lat, destinoCoords?.lng]);

  // Aviso "sem mototaxistas" fica apenas como banner sutil no mapa;
  // o modal só abre no timeout de 90s após CHAMAR MOTOTAXI (ver efeito abaixo).

  // ----- Popup "sem mototaxistas" — timeout 90s na chamada -----
  const [searchCountdown, setSearchCountdown] = useState(90);
  useEffect(() => {
    if (step !== "waiting") {
      setSearchCountdown(90);
      return;
    }
    setSearchCountdown(90);
    const interval = setInterval(() => {
      setSearchCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    const t = setTimeout(() => {
      setNoDriversReason("timeout");
      setShowNoDrivers(true);
      // Cancela a corrida em aberto
      handleCancel().catch(() => {});
    }, 90000);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);


  // ----- Autocomplete destino -----
  useEffect(() => {
    if (!destFocused) return;
    if (!profile?.cidade || !profile.estado) return;
    const q = destino.trim();
    if (q.length < 2) {
      setDestSug([]);
      return;
    }
    setSearchingDest(true);
    const id = setTimeout(async () => {
      try {
        const res = await searchSuggestions(q, profile.cidade!, profile.estado!);
        setDestSug(res);
      } finally {
        setSearchingDest(false);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [destino, destFocused, profile?.cidade, profile?.estado]);

  // ----- Autocomplete origem -----
  useEffect(() => {
    if (!origemFocused) return;
    if (!profile?.cidade || !profile.estado) return;
    const q = origem.trim();
    if (q.length < 2) {
      setOrigemSug([]);
      return;
    }
    setSearchingOrigem(true);
    const id = setTimeout(async () => {
      try {
        const res = await searchSuggestions(q, profile.cidade!, profile.estado!);
        setOrigemSug(res);
      } finally {
        setSearchingOrigem(false);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [origem, origemFocused, profile?.cidade, profile?.estado]);

  // ----- Calcular tarifa quando origem+destino prontos -----
  // Usa RPC calcular_preco_corrida (novo modelo: valor-base municipal + Taxa InterGO,
  // com regras por bairro sobrescrevendo o valor-base). O snapshot é gravado
  // automaticamente pelo trigger `trg_snapshot_preco_corrida` no INSERT.
  const computeTarifa = useCallback(
    async (bOrigem: string | null, bDestino: string | null) => {
      if (!cidadeId) return null;
      let bOrigemId: string | null = null;
      let bDestinoId: string | null = null;
      const nomes = [bOrigem, bDestino].filter(Boolean) as string[];
      if (nomes.length) {
        const { data: bs } = await (supabase as any)
          .from("bairros")
          .select("id, nome")
          .eq("cidade_id", cidadeId)
          .eq("ativo", true)
          .in("nome", nomes);
        const map = new Map<string, string>((bs ?? []).map((r: any) => [r.nome, r.id]));
        if (bOrigem && map.has(bOrigem)) bOrigemId = map.get(bOrigem)!;
        if (bDestino && map.has(bDestino)) bDestinoId = map.get(bDestino)!;
      }
      const { data, error } = await (supabase as any).rpc("calcular_preco_corrida", {
        _cidade_id: cidadeId,
        _bairro_origem_id: bOrigemId,
        _bairro_destino_id: bDestinoId,
      });
      if (!error && data && data[0]?.valor_total != null) {
        const row = data[0];
        return {
          nome: "Tarifa base",
          valor: Number(row.valor_base ?? 0),
          adicional: Number(row.taxa_bora_ze ?? 0),
          total: Number(row.valor_total ?? 0),
        };
      }
      return null;
    },
    [cidadeId],
  );

  useEffect(() => {
    if (!origemCoords || !destinoCoords) {
      setTarifaInfo(null);
      return;
    }
    let cancel = false;
    setCalculatingTarifa(true);
    (async () => {
      const t = await computeTarifa(bairroOrigem, bairroDestino);
      if (!cancel) {
        setTarifaInfo(t);
        setCalculatingTarifa(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [origemCoords, destinoCoords, bairroOrigem, bairroDestino, computeTarifa]);

  // ----- Selecionar destino (sugestão ou favorito) -----
  async function pickDestSuggestion(s: NominatimResult) {
    const lat = Number(s.lat);
    const lng = Number(s.lon);
    setDestino(s.display_name);
    setDestinoCoords({ lat, lng });
    setBairroDestino(matchBairro(bairros, extractBairro(s)));
    setDestFocused(false);
    setDestSug([]);
  }
  async function pickDestino(d: DestinoUsuario) {
    setDestino(d.endereco);
    setDestinoCoords(d.latitude && d.longitude ? { lat: d.latitude, lng: d.longitude } : null);
    setBairroDestino(null);
    setDestFocused(false);
  }
  async function renameDestino(id: string, atual: string | null) {
    const novo = window.prompt("Apelido do destino (ex: Casa da mãe):", atual ?? "");
    if (novo === null) return;
    const nome = novo.trim() || null;
    const { error } = await (supabase as any)
      .from("destinos_passageiro")
      .update({ nome })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setDestinos((arr) => arr.map((d) => (d.id === id ? { ...d, nome } : d)));
  }
  async function toggleFavorito(id: string, atual: boolean) {
    const { error } = await (supabase as any)
      .from("destinos_passageiro")
      .update({ favorito: !atual })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setDestinos((arr) =>
      [...arr.map((d) => (d.id === id ? { ...d, favorito: !atual } : d))].sort((a, b) => {
        if (a.favorito !== b.favorito) return a.favorito ? -1 : 1;
        return b.ultima_vez_usado.localeCompare(a.ultima_vez_usado);
      }),
    );
  }
  async function removeDestino(id: string) {
    if (!window.confirm("Remover este destino do histórico?")) return;
    const { error } = await (supabase as any)
      .from("destinos_passageiro")
      .delete()
      .eq("id", id);
    if (error) return toast.error(error.message);
    setDestinos((arr) => arr.filter((d) => d.id !== id));
  }
  async function pickLugarComum(termo: string, label: string) {
    if (!profile?.cidade || !profile?.estado) return;
    setBuscandoLugar(termo);
    try {
      const res = await searchSuggestions(termo, profile.cidade, profile.estado);
      if (res.length === 0) {
        toast.error(`Nenhum ${label.toLowerCase()} encontrado em ${profile.cidade}`);
        return;
      }
      // Prefer nearest to origem when available
      const ordered = origemCoords
        ? [...res].sort((a, b) => {
            const da = haversine(origemCoords.lat, origemCoords.lng, Number(a.lat), Number(a.lon));
            const db = haversine(origemCoords.lat, origemCoords.lng, Number(b.lat), Number(b.lon));
            return da - db;
          })
        : res;
      await pickDestSuggestion(ordered[0]);
    } finally {
      setBuscandoLugar(null);
    }
  }

  /** Coleta em órgão pré-definido (geocode best-effort — nome sempre prevalece). */
  async function selecionarOrgaoOrigem(nome: string) {
    setOrigemModo("orgao");
    setOrgaoOrigem(nome);
    setOrigem(nome);
    setOrigemCoords(null);
    setBairroOrigem(null);
    if (!profile?.cidade || !profile?.estado) return;
    setBuscandoOrgaoOrigem(nome);
    try {
      const res = await searchSuggestions(nome, profile.cidade, profile.estado);
      if (res[0]) {
        setOrigemCoords({ lat: Number(res[0].lat), lng: Number(res[0].lon) });
        setBairroOrigem(matchBairro(bairros, extractBairro(res[0])));
      }
    } catch {
      /* geocode é opcional */
    } finally {
      setBuscandoOrgaoOrigem(null);
    }
  }

  /** Entrega em órgão pré-definido. */
  async function selecionarOrgaoDestino(nome: string) {
    setEntregaModo("orgao");
    setOrgaoDestino(nome);
    setDestino(nome);
    setDestinoCoords(null);
    setBairroDestino(null);
    if (!profile?.cidade || !profile?.estado) return;
    setBuscandoLugar(nome);
    try {
      const res = await searchSuggestions(nome, profile.cidade, profile.estado);
      if (res[0]) {
        setDestinoCoords({ lat: Number(res[0].lat), lng: Number(res[0].lon) });
        setBairroDestino(matchBairro(bairros, extractBairro(res[0])));
      }
    } catch {
      /* geocode é opcional */
    } finally {
      setBuscandoLugar(null);
    }
  }

  /** Entrega no endereço já identificado do servidor. */
  async function usarMeuEnderecoNaEntrega() {
    setEntregaModo("meu_endereco");
    setOrgaoDestino(null);
    if (meuEndereco) {
      setDestino(meuEndereco.display);
      setDestinoCoords(meuEndereco.coords);
      setBairroDestino(meuEndereco.bairro);
      return;
    }
    const coords = await geo.request();
    if (!coords) {
      toast.error("Não consegui identificar seu endereço. Escolha 'Outro local'.");
      return;
    }
    const { display, bairro } = await reverseToAddress(coords.lat, coords.lng);
    const b = matchBairro(bairros, bairro);
    setMeuEndereco({ display, coords, bairro: b });
    setDestino(display);
    setDestinoCoords(coords);
    setBairroDestino(b);
  }
  async function pickOrigemSuggestion(s: NominatimResult) {
    const lat = Number(s.lat);
    const lng = Number(s.lon);
    setOrigem(s.display_name);
    setOrigemCoords({ lat, lng });
    setBairroOrigem(matchBairro(bairros, extractBairro(s)));
    setOrigemFocused(false);
    setOrigemSug([]);
  }

  // ----- Chamar mototaxi -----
  async function callRide() {
    if (!user || !profile?.cidade) return;
    if (!origem.trim()) return toast.error("Informe o local de coleta.");
    if (!destino.trim()) return toast.error("Informe o local de entrega.");
    if (!tipoDemanda) return toast.error("Selecione o tipo de solicitação.");
    const ehGratuita = contadorBrinde >= 10;
    const valor = ehGratuita ? 0 : tarifaInfo?.total ?? 0;

    // upsert destinos_passageiro (proximidade <100m OU endereço igual)
    let ehPrimeiroDestino = false;
    try {
      const { count } = await (supabase as any)
        .from("destinos_passageiro")
        .select("id", { count: "exact", head: true })
        .eq("passageiro_id", user.id);
      ehPrimeiroDestino = (count ?? 0) === 0;

      const { data: mine } = await (supabase as any)
        .from("destinos_passageiro")
        .select("id,endereco,latitude,longitude,vezes_usado")
        .eq("passageiro_id", user.id);
      const existing = ((mine ?? []) as any[]).find((d) => {
        if (d.endereco && d.endereco.toLowerCase() === destino.toLowerCase()) return true;
        if (destinoCoords && d.latitude && d.longitude) {
          const km = haversine(d.latitude, d.longitude, destinoCoords.lat, destinoCoords.lng);
          return km < 0.1;
        }
        return false;
      });
      if (existing) {
        await (supabase as any)
          .from("destinos_passageiro")
          .update({
            ultima_vez_usado: new Date().toISOString(),
            vezes_usado: (existing.vezes_usado ?? 1) + 1,
          })
          .eq("id", existing.id);
      } else {
        await (supabase as any).from("destinos_passageiro").insert({
          passageiro_id: user.id,
          endereco: destino,
          latitude: destinoCoords?.lat ?? null,
          longitude: destinoCoords?.lng ?? null,
          vezes_usado: 1,
          ultima_vez_usado: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("erro upsert destinos_passageiro", e);
    }

    const { data, error } = await supabase
      .from("corridas")
      .insert({
        passageiro_id: user.id,
        origem_endereco: origem,
        destino_endereco: destino,
        origem_lat: origemCoords?.lat ?? null,
        origem_lng: origemCoords?.lng ?? null,
        destino_lat: destinoCoords?.lat ?? null,
        destino_lng: destinoCoords?.lng ?? null,
        valor_estimado: valor,
        eh_gratuita: ehGratuita,
        pagamento_tipo: "dinheiro",
        status: "aguardando" as const,
        descricao: [
          tipoDemanda ? TIPOS_DEMANDA.find((t) => t.id === tipoDemanda)?.label : null,
          salaEntrega.trim() ? `Sala: ${salaEntrega.trim()}` : null,
          responsavelEntrega.trim() ? `Responsável: ${responsavelEntrega.trim()}` : null,
          observacao.trim() || null,
        ]
          .filter(Boolean)
          .join(" — ") || null,
        bairro_origem: bairroOrigem,
        bairro_destino: bairroDestino,
        cidade: profile.cidade,
        estado: profile.estado,
      } as any)
      .select(
        "id,status,mototaxista_id,origem_endereco,destino_endereco,valor_estimado,valor_final,eh_gratuita",
      )
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setCorrida(data as Corrida);
    setStep("waiting");
    if (ehPrimeiroDestino) {
      toast.success(
        "Salvamos esse destino nos seus favoritos. Da próxima vez é 1 toque só.",
      );
    }
  }

  async function callPegueAli() {
    if (!user || !profile?.cidade) return;
    if (pegueSubmitting) return;
    if (!origemCoords) return toast.error("Selecione onde buscar na lista.");
    if (!destinoCoords) return toast.error("Selecione onde entregar na lista.");
    if (pegueDescricao.trim().length < 3) return toast.error("Descreva o que buscar.");
    if (!peguePagamento) return toast.error("Selecione se precisa pagar no local.");
    if (peguePagamento === "na_hora") {
      const v = Number((pegueValorLocal || "").replace(",", "."));
      if (!v || v <= 0) return toast.error("Informe um valor estimado.");
    }

    setPegueSubmitting(true);
    try {
      let fotoUrl: string | null = null;
      if (pegueFoto) {
        const ext = pegueFoto.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("pegue-ali-anexos").upload(path, pegueFoto, {
          contentType: pegueFoto.type || "image/jpeg",
          upsert: false,
        });
        if (up.error) {
          toast.error("Falha ao enviar foto: " + up.error.message);
        } else {
          fotoUrl = path;
        }
      }

      const valor = tarifaInfo?.total ?? 0;
      const valorLocal = peguePagamento === "na_hora"
        ? Number((pegueValorLocal || "0").replace(",", "."))
        : null;

      const { data, error } = await supabase
        .from("corridas")
        .insert({
          passageiro_id: user.id,
          origem_endereco: origem,
          destino_endereco: destino,
          origem_lat: origemCoords?.lat ?? null,
          origem_lng: origemCoords?.lng ?? null,
          destino_lat: destinoCoords?.lat ?? null,
          destino_lng: destinoCoords?.lng ?? null,
          valor_estimado: valor,
          eh_gratuita: false,
          pagamento_tipo: "dinheiro",
          status: "aguardando" as const,
          bairro_origem: bairroOrigem,
          bairro_destino: bairroDestino,
          cidade: profile.cidade,
          estado: profile.estado,
          tipo: "pegue_ali",
          descricao: pegueDescricao.trim().slice(0, 150),
          foto_url: fotoUrl,
          pagamento_no_local: peguePagamento === "na_hora",
          valor_pagamento_local: valorLocal,
          em_nome_de: peguePagamento === "pago" ? (pegueEmNomeDe.trim() || null) : null,
        } as any)
        .select(
          "id,status,mototaxista_id,origem_endereco,destino_endereco,valor_estimado,valor_final,eh_gratuita",
        )
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      setCorrida(data as Corrida);
      setStep("waiting");
      toast.success("Pedido enviado! Buscando um mototaxista…");
    } finally {
      setPegueSubmitting(false);
    }
  }


  // ----- Realtime: corrida -----
  useEffect(() => {
    if (!corrida) return;
    const ch = supabase
      .channel(`corrida-passageiro-${corrida.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "corridas",
          filter: `id=eq.${corrida.id}`,
        },
        (payload) => setCorrida(payload.new as Corrida),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [corrida?.id]);

  // ----- Reagir a mudanças de status -----
  const lastStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!corrida) return;
    if (lastStatus.current === corrida.status) return;
    lastStatus.current = corrida.status;
    if (corrida.status === "aceita") {
      setStep("assigned");
      toast.success("Mototaxista a caminho!");
    } else if (corrida.status === "em_andamento") {
      setStep("in_progress");
    } else if (corrida.status === "concluida") {
      setStep("rate");
    } else if (corrida.status === "cancelada") {
      toast.message("Corrida cancelada");
      resetFlow();
    }
  }, [corrida?.status]); // eslint-disable-line

  // ----- Carregar info do mototaxista quando aceita -----
  useEffect(() => {
    if (!corrida?.mototaxista_id) {
      setMotoInfo(null);
      return;
    }
    const id = corrida.mototaxista_id;
    let cancel = false;
    (async () => {
      const { data } = await (supabase as any).rpc("get_mototaxista_publico", { _id: id });
      const info = Array.isArray(data) ? data[0] : data;
      if (cancel || !info) return;
      setMotoInfo({
        id,
        nome: info.nome ?? "Mototaxista",
        telefone: info.telefone ?? "",
        foto_url: info.foto_url ?? null,
        plano: info.plano ?? null,
        moto_modelo: info.modelo_moto ?? null,
        moto_placa: info.placa_moto ?? null,
        nota_media: null,
        latitude: info.latitude ?? null,
        longitude: info.longitude ?? null,
      });
    })();
    // realtime tracking
    const ch = supabase
      .channel(`moto-pos-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mototaxistas", filter: `id=eq.${id}` },
        (payload) => {
          const n = payload.new as any;
          setMotoInfo((prev) =>
            prev
              ? { ...prev, latitude: n.latitude ?? prev.latitude, longitude: n.longitude ?? prev.longitude }
              : prev,
          );
        },
      )
      .subscribe();
    return () => {
      cancel = true;
      supabase.removeChannel(ch);
    };
  }, [corrida?.mototaxista_id]);

  // Detectar "chegou" — heurística: mototaxista < 80m do passageiro
  useEffect(() => {
    if (step !== "assigned") return;
    if (!motoInfo?.latitude || !motoInfo?.longitude || !origemCoords) return;
    const dist = haversine(
      origemCoords.lat,
      origemCoords.lng,
      Number(motoInfo.latitude),
      Number(motoInfo.longitude),
    );
    if (dist < 0.08 && !chegou) {
      setChegou(true);
      setStep("arrived");
    }
  }, [motoInfo?.latitude, motoInfo?.longitude, origemCoords, step, chegou]);

  function resetFlow() {
    setCorrida(null);
    setMotoInfo(null);
    setDestino("");
    setDestinoCoords(null);
    setBairroDestino(null);
    setTarifaInfo(null);
    setNota(0);
    setComentario("");
    setChegou(false);
    setStep("setup");
    lastStatus.current = null;
  }

  async function handleCancel() {
    if (!corrida) return;
    await supabase.from("corridas").update({ status: "cancelada" }).eq("id", corrida.id);
  }

  async function embarquei() {
    if (!corrida) return;
    const { error } = await supabase
      .from("corridas")
      .update({ status: "em_andamento" })
      .eq("id", corrida.id);
    if (error) toast.error(error.message);
  }

  async function enviarAvaliacao() {
    if (!user || !corrida?.mototaxista_id) return;
    if (nota < 1) return toast.error("Escolha uma nota");
    const { error } = await supabase.from("avaliacoes").insert({
      corrida_id: corrida.id,
      avaliador_id: user.id,
      avaliado_id: corrida.mototaxista_id,
      nota,
      comentario: comentario || null,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Avaliação enviada!");
    setStep("done");
  }

  // ===== Render =====
  const headerName = profile?.nome ?? "Secretaria";
  const faltam = Math.max(0, 10 - contadorBrinde);
  const mapCenter: [number, number] | null = useMemo(() => {
    if (origemCoords) return [origemCoords.lat, origemCoords.lng];
    return null;
  }, [origemCoords]);

  const fitPoints: [number, number][] = useMemo(() => {
    const arr: [number, number][] = [];
    if (origemCoords) arr.push([origemCoords.lat, origemCoords.lng]);
    if ((step === "assigned" || step === "arrived") && motoInfo?.latitude && motoInfo?.longitude) {
      arr.push([Number(motoInfo.latitude), Number(motoInfo.longitude)]);
    }
    if (destinoCoords && step !== "assigned" && step !== "arrived") {
      arr.push([destinoCoords.lat, destinoCoords.lng]);
    }
    return arr;
  }, [origemCoords, motoInfo?.latitude, motoInfo?.longitude, destinoCoords, step]);

  if (authLoading || !user) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: c.bg }}
      >
        <Loader2 className="animate-spin" style={{ color: c.btn }} />
      </main>
    );
  }

  const defaultCenter: [number, number] = mapCenter ?? [-11.328, -38.957]; // Araci-BA

  return (
    <main
      className="h-[100dvh] w-full flex flex-col overflow-hidden"
      style={{ background: c.bg, color: c.text, fontFamily: "Inter, sans-serif", paddingBottom: 64 }}
    >
      {/* HEADER */}
      <header
        className="flex items-center justify-between px-4 py-3 z-30 shrink-0 gap-3 border-b"
        style={{ background: c.headerBg, color: c.text, borderBottomColor: c.divider }}
      >
        <img
          src={logoIntergo.url}
          alt="InterGO"
          className="h-8 w-auto shrink-0"
          style={{ objectFit: "contain", filter: "brightness(0)" }}
        />
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate text-sm sm:text-base" style={{ letterSpacing: "-0.02em" }}>
            {headerName}
          </div>
          <div className="text-[11px] sm:text-xs truncate" style={{ color: c.textMuted }}>
            {profile?.cidade ? `Logística institucional • ${profile.cidade}` : "Logística institucional"}
          </div>
        </div>
        <button
          onClick={() => navigate({ to: "/passageiro/perfil" })}
          aria-label="Perfil do servidor"
          className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style={{ background: c.cardBg, color: c.text, border: `1px solid ${c.divider}` }}
        >
          {headerName.slice(0, 2).toUpperCase()}
        </button>
      </header>

      {/* MAPA (60%) */}
      <section className="relative" style={{ height: "60%", minHeight: 240 }}>
        {mounted && (
          <MapContainer
            center={defaultCenter}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapRecenter center={mapCenter} />
            {fitPoints.length >= 2 && <FitBounds points={fitPoints} />}

            {/* Passageiro / origem (pino roxo) */}
            {origemCoords && (
              <>
                <Marker
                  position={[origemCoords.lat, origemCoords.lng]}
                  icon={emojiIcon("", 40, "#7B00D4")}
                />
                <Circle
                  center={[origemCoords.lat, origemCoords.lng]}
                  radius={300}
                  pathOptions={{ color: "#7B00D4", fillColor: "#7B00D4", fillOpacity: 0.08, weight: 1 }}
                />
              </>
            )}

            {/* Destino (bandeira verde) */}
            {destinoCoords && step !== "assigned" && step !== "arrived" && (
              <Marker
                position={[destinoCoords.lat, destinoCoords.lng]}
                icon={emojiIcon("", 38, "#3DB54A")}
              />
            )}

            {/* Rota OSRM origem → destino */}
            {routeCoords.length > 1 && step !== "assigned" && step !== "arrived" && (
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: "#3DB54A", weight: 4, opacity: 0.9 }}
              />
            )}

            {/* Fallback: linha reta caso OSRM falhe */}
            {origemCoords && destinoCoords && routeCoords.length === 0 &&
              (step === "in_progress" || step === "rate") && (
                <Polyline
                  positions={[
                    [origemCoords.lat, origemCoords.lng],
                    [destinoCoords.lat, destinoCoords.lng],
                  ]}
                  pathOptions={{ color: "#3DB54A", weight: 4 }}
                />
              )}

            {/* Mototaxistas online (apenas no setup) */}
            {step === "setup" &&
              motosOnline.map((m) => (
                <Marker
                  key={m.id}
                  position={[m.latitude, m.longitude]}
                  icon={emojiIcon("", 32, "#3DB54A")}
                >
                  <Popup>
                    <div style={{ minWidth: 160, fontFamily: "Inter, sans-serif" }}>
                      <div className="flex items-center gap-2">
                        {m.foto_url ? (
                          <img
                            src={m.foto_url}
                            alt={m.nome ?? ""}
                            style={{
                              width: 44, height: 44, borderRadius: "50%",
                              objectFit: "cover", border: "2px solid #3DB54A",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 44, height: 44, borderRadius: "50%",
                              background: "#eee", display: "flex",
                              alignItems: "center", justifyContent: "center",
                              fontSize: 22,
                            }}
                          ><EmojiIcon e="🏍️" /></div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#111" }}>
                            {m.nome ?? "Mototaxista"}
                          </div>
                          <div style={{ fontSize: 11, color: "#555" }}>
                            <EmojiIcon e="⭐" /> Disponível
                          </div>
                          {m.placa_moto && (
                            <div style={{ fontSize: 11, color: "#777" }}>
                              {m.modelo_moto ?? "Moto"} • {formatarPlaca(m.placa_moto)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Mototaxista atribuído */}
            {(step === "assigned" || step === "arrived") &&
              motoInfo?.latitude &&
              motoInfo?.longitude && (
                <>
                  <Marker
                    position={[Number(motoInfo.latitude), Number(motoInfo.longitude)]}
                    icon={emojiIcon("", 40, c.btn)}
                  />
                  {origemCoords && (
                    <Polyline
                      positions={[
                        [Number(motoInfo.latitude), Number(motoInfo.longitude)],
                        [origemCoords.lat, origemCoords.lng],
                      ]}
                      pathOptions={{ color: c.btn, weight: 3, dashArray: "8 8" }}
                    />
                  )}
                </>
              )}
          </MapContainer>
        )}

        {/* Aviso sutil: nenhum mototaxista disponível */}
        {step === "setup" && motosLoaded && motosOnline.length === 0 && !showNoDrivers && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs shadow-md z-[400] pointer-events-none"
            style={{ background: c.cardBg, color: c.textMuted, border: `1px solid ${c.divider}` }}
          >
            Nenhum mototaxista disponível no momento
          </div>
        )}

        {/* Botão recentralizar */}
        <button
          onClick={detectOrigin}
          disabled={detectingOrigin}
          className="absolute right-3 bottom-3 rounded-full p-3 shadow-lg disabled:opacity-60 z-[400]"
          style={{ background: c.cardBg, color: c.text }}
          aria-label="Minha localização"
        >
          {detectingOrigin ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />}
        </button>
      </section>


      {/* PAINEL INFERIOR (40%) */}
      <section
        className="relative -mt-4 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col z-20"
        style={{ background: c.panel, minHeight: "40%" }}
      >
        <div
          className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full shrink-0"
          style={{ background: c.divider }}
        />
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
          {step === "setup" && (
            <SetupPanel
              c={c}
              origem={origem}
              setOrigem={(v) => {
                setOrigem(v);
                setOrigemCoords(null);
                setBairroOrigem(null);
              }}
              origemFocused={origemFocused}
              setOrigemFocused={setOrigemFocused}
              origemSug={origemSug}
              searchingOrigem={searchingOrigem}
              pickOrigemSuggestion={pickOrigemSuggestion}
              origemCoords={origemCoords}
              detectOrigin={detectOrigin}
              detectingOrigin={detectingOrigin}
              destino={destino}
              setDestino={(v) => {
                setDestino(v);
                setDestinoCoords(null);
                setBairroDestino(null);
              }}
              destFocused={destFocused}
              setDestFocused={setDestFocused}
              destSug={destSug}
              searchingDest={searchingDest}
              destinos={destinos}
              pickDestSuggestion={pickDestSuggestion}
              pickDestino={pickDestino}
              onRenameDestino={renameDestino}
              onToggleFavorito={toggleFavorito}
              onRemoveDestino={removeDestino}
              onPickLugarComum={pickLugarComum}
              buscandoLugar={buscandoLugar}
              destinoCoords={destinoCoords}
              tarifaInfo={tarifaInfo}
              calculatingTarifa={calculatingTarifa}
              ehGratuita={contadorBrinde >= 10}
              onCall={callRide}
              mode={mode}
              setMode={setMode}
              pegueDescricao={pegueDescricao}
              setPegueDescricao={setPegueDescricao}
              pegueFoto={pegueFoto}
              pegueFotoPreview={pegueFotoPreview}
              onPickFoto={(f) => {
                setPegueFoto(f);
                if (pegueFotoPreview) URL.revokeObjectURL(pegueFotoPreview);
                setPegueFotoPreview(f ? URL.createObjectURL(f) : null);
              }}
              peguePagamento={peguePagamento}
              setPeguePagamento={setPeguePagamento}
              pegueValorLocal={pegueValorLocal}
              setPegueValorLocal={setPegueValorLocal}
              pegueEmNomeDe={pegueEmNomeDe}
              setPegueEmNomeDe={setPegueEmNomeDe}
              pegueSubmitting={pegueSubmitting}
              onPegueSubmit={callPegueAli}
              saudacao={headerName}
              tipo={tipoDemanda}
              setTipo={setTipoDemanda}
              observacao={observacao}
              setObservacao={setObservacao}
              orgaos={ORGAOS}
              origemModo={origemModo}
              setOrigemModo={(m) => {
                setOrigemModo(m);
                if (m === "outro") {
                  setOrgaoOrigem(null);
                  setOrigem("");
                  setOrigemCoords(null);
                  setBairroOrigem(null);
                }
              }}
              orgaoOrigem={orgaoOrigem}
              onPickOrgaoOrigem={selecionarOrgaoOrigem}
              buscandoOrgaoOrigem={buscandoOrgaoOrigem}
              entregaModo={entregaModo}
              setEntregaModo={(m) => {
                if (m === "meu_endereco") return void usarMeuEnderecoNaEntrega();
                setEntregaModo(m);
                if (m === "outro") {
                  setOrgaoDestino(null);
                  setDestino("");
                  setDestinoCoords(null);
                  setBairroDestino(null);
                }
              }}
              orgaoDestino={orgaoDestino}
              onPickOrgaoDestino={selecionarOrgaoDestino}
              meuEndereco={meuEndereco?.display ?? null}
              sala={salaEntrega}
              setSala={setSalaEntrega}
              responsavel={responsavelEntrega}
              setResponsavel={setResponsavelEntrega}
            />
          )}

          {step === "waiting" && (
            <WaitingPanel c={c} onCancel={handleCancel} countdown={searchCountdown} />
          )}

          {(step === "assigned" || step === "arrived") && motoInfo && (
            <DriverPanel
              c={c}
              moto={motoInfo}
              passageiroPos={origemCoords}
              chegou={step === "arrived"}
              onEmbarquei={embarquei}
              onCancel={handleCancel}
            />
          )}

          {step === "in_progress" && motoInfo && (
            <InProgressPanel c={c} moto={motoInfo} nomePassageiro={headerName} />
          )}

          {step === "rate" && corrida && (
            <RatePanel
              c={c}
              valor={Number(corrida.valor_final ?? corrida.valor_estimado)}
              nota={nota}
              setNota={setNota}
              comentario={comentario}
              setComentario={setComentario}
              onSend={enviarAvaliacao}
            />
          )}

          {step === "done" && (
            <DonePanel
              c={c}
              faltam={Math.max(0, 10 - ((contadorBrinde + 1) % 11))}
              onNew={resetFlow}
            />
          )}
        </div>
      </section>

      {/* Modal: sem mototaxistas disponíveis */}
      {showNoDrivers && (
        <NoDriversModal
          c={c}
          reason={noDriversReason}
          onRetry={() => {
            setShowNoDrivers(false);
            setMotosLoaded(false);
            if (step !== "setup") resetFlow();
          }}
          onNotify={async () => {
            if (!user || !profile?.cidade) return;
            try {
              await supabase
                .from("passageiro_enderecos_favoritos" as any)
                .insert({
                  passageiro_id: user.id,
                  endereco: `__notify__:${profile.cidade}`,
                  latitude: origemCoords?.lat ?? null,
                  longitude: origemCoords?.lng ?? null,
                });
              toast.success("Avisaremos quando um mototaxista ficar disponível!");
            } catch {
              toast.success("Aviso registrado.");
            }
            setShowNoDrivers(false);
          }}
          onClose={() => setShowNoDrivers(false)}
        />
      )}

      {user && corrida && corrida.mototaxista_id && (step === "assigned" || step === "arrived" || step === "in_progress") && (
        <>
          <ChatFab onClick={() => setChatOpen(true)} />
          {chatOpen && (
            <ChatCorrida
              corridaId={corrida.id}
              meuId={user.id}
              meuTipo="passageiro"
              outro={{
                nome: motoInfo?.nome ?? "Mototaxista",
                foto_url: motoInfo?.foto_url ?? null,
                telefone: motoInfo?.telefone ?? null,
                estrelas: motoInfo?.nota_media ?? null,
                status: step === "arrived" ? "Chegou" : step === "in_progress" ? "Em andamento" : "A caminho",
              }}
              onClose={() => setChatOpen(false)}
              onReportar={() => toast.info("Denúncia registrada — nossa equipe vai analisar.")}
            />
          )}
        </>
      )}

      <PassageiroTabBar />
    </main>
  );
}

// ===== Sub-panels =====
type C = (typeof PALETTES)["dark"];

function Bubble({
  c,
  role,
  children,
}: {
  c: C;
  role: "system" | "user";
  children: React.ReactNode;
}) {
  const isSys = role === "system";
  return (
    <div className={`flex ${isSys ? "justify-start" : "justify-end"} mb-2`}>
      <div
        className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug shadow-sm whitespace-pre-line"
        style={{
          background: isSys ? c.sysBubble : c.userBubble,
          color: c.text,
          borderTopLeftRadius: isSys ? 6 : 16,
          borderTopRightRadius: isSys ? 16 : 6,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SetupPanel(props: {
  c: C;
  origem: string;
  setOrigem: (v: string) => void;
  origemFocused: boolean;
  setOrigemFocused: (v: boolean) => void;
  origemSug: NominatimResult[];
  searchingOrigem: boolean;
  pickOrigemSuggestion: (s: NominatimResult) => void;
  origemCoords: { lat: number; lng: number } | null;
  detectOrigin: () => void;
  detectingOrigin: boolean;
  destino: string;
  setDestino: (v: string) => void;
  destFocused: boolean;
  setDestFocused: (v: boolean) => void;
  destSug: NominatimResult[];
  searchingDest: boolean;
  destinos: DestinoUsuario[];
  pickDestSuggestion: (s: NominatimResult) => void;
  pickDestino: (d: DestinoUsuario) => void;
  onRenameDestino: (id: string, atual: string | null) => void;
  onToggleFavorito: (id: string, atual: boolean) => void;
  onRemoveDestino: (id: string) => void;
  onPickLugarComum: (termo: string, label: string) => void;
  buscandoLugar: string | null;
  destinoCoords: { lat: number; lng: number } | null;
  tarifaInfo: { valor: number; adicional: number; total: number; nome: string } | null;
  calculatingTarifa: boolean;
  ehGratuita: boolean;
  onCall: () => void;
  mode: "corrida" | "pegue_ali";
  setMode: (m: "corrida" | "pegue_ali") => void;
  pegueDescricao: string;
  setPegueDescricao: (v: string) => void;
  pegueFoto: File | null;
  pegueFotoPreview: string | null;
  onPickFoto: (f: File | null) => void;
  peguePagamento: "pago" | "na_hora" | null;
  setPeguePagamento: (v: "pago" | "na_hora") => void;
  pegueValorLocal: string;
  setPegueValorLocal: (v: string) => void;
  pegueEmNomeDe: string;
  setPegueEmNomeDe: (v: string) => void;
  pegueSubmitting: boolean;
  onPegueSubmit: () => void;
  saudacao: string;
  tipo: TipoDemanda | null;
  setTipo: (t: TipoDemanda) => void;
  observacao: string;
  setObservacao: (v: string) => void;
  orgaos: string[];
  origemModo: "orgao" | "outro";
  setOrigemModo: (m: "orgao" | "outro") => void;
  orgaoOrigem: string | null;
  onPickOrgaoOrigem: (nome: string) => void;
  buscandoOrgaoOrigem: string | null;
  entregaModo: "meu_endereco" | "orgao" | "outro";
  setEntregaModo: (m: "meu_endereco" | "orgao" | "outro") => void;
  orgaoDestino: string | null;
  onPickOrgaoDestino: (nome: string) => void;
  meuEndereco: string | null;
  sala: string;
  setSala: (v: string) => void;
  responsavel: string;
  setResponsavel: (v: string) => void;
}) {
  const { c } = props;
  const isPegue = props.mode === "pegue_ali";
  const canCall = !!props.origem.trim() && !!props.destino.trim() && !!props.tipo;
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  // Placeholder rotativo do textarea "O que buscar?"
  const PLACEHOLDERS = [
    "Ex: Encomenda em nome de Maria Silva",
    "Ex: Uma caixa de remédio",
    "Ex: Bolo reservado às 15h",
  ];
  const [phIdx, setPhIdx] = useState(0);
  useEffect(() => {
    if (!isPegue) return;
    const t = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, [isPegue]);
  return (
    <div className="space-y-3">
      {/* Cabeçalho do fluxo de envio */}
      <div className="pt-1">
        <h1
          className="text-center text-[17px] font-semibold"
          style={{ color: c.text, letterSpacing: "-0.02em" }}
        >
          Para onde vai enviar?
        </h1>
      </div>

      <button
        type="button"
        className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium"
        style={{ background: c.cardBg, color: c.text, border: `1px solid ${c.divider}` }}
      >
        <Clock size={15} /> Partir <ChevronDown size={15} />
      </button>


      <div className="text-xs font-semibold px-1 pt-1" style={{ color: c.text }}>
        Busque em:
      </div>
      <div className="flex flex-wrap gap-1.5">
        {props.orgaos.map((o) => {
          const active = props.origemModo === "orgao" && props.orgaoOrigem === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => props.onPickOrgaoOrigem(o)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] flex items-center gap-1.5"
              style={{
                background: active ? c.btn : c.cardBg,
                color: active ? c.btnText : c.text,
                border: `1px solid ${active ? c.btn : c.divider}`,
              }}
            >
              {props.buscandoOrgaoOrigem === o && <Loader2 size={12} className="animate-spin" />}
              {o}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => props.setOrigemModo("outro")}
          className="rounded-full px-3 py-1.5 text-xs font-medium"
          style={{
            background: props.origemModo === "outro" ? c.btn : c.cardBg,
            color: props.origemModo === "outro" ? c.btnText : c.text,
            border: `1px solid ${props.origemModo === "outro" ? c.btn : c.divider}`,
          }}
        >
          Outro local
        </button>
      </div>


      {/* Origem (livre) */}
      {props.origemModo === "outro" && (
      <div className="relative">
        <div
          className="rounded-2xl p-3 flex items-center gap-2"
          style={{ background: c.cardBg }}
        >
          <MapPin size={18} style={{ color: c.btn }} />
          <input
            value={props.origem}
            onChange={(e) => props.setOrigem(e.target.value)}
            onFocus={() => props.setOrigemFocused(true)}
            onBlur={() => setTimeout(() => props.setOrigemFocused(false), 150)}
            placeholder="Local de coleta — ex.: Farmácia Central"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: c.text }}
          />
          {props.searchingOrigem && <Loader2 size={14} className="animate-spin opacity-60" />}
          <button
            onClick={props.detectOrigin}
            disabled={props.detectingOrigin}
            className="p-1.5 rounded-full disabled:opacity-60"
            style={{ background: c.inputBg, color: c.text }}
            aria-label="Usar minha localização atual"
            title="Usar minha localização atual"
          >
            {props.detectingOrigin ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Crosshair size={16} />
            )}
          </button>
        </div>

        {props.origemFocused && props.origemSug.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 rounded-2xl shadow-xl overflow-hidden z-30 max-h-72 overflow-y-auto"
            style={{ background: c.cardBg, border: `1px solid ${c.divider}` }}
          >
            {props.origemSug.map((s, i) => (
              <button
                key={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => props.pickOrigemSuggestion(s)}
                className="w-full text-left px-3 py-2 hover:opacity-80 flex items-center gap-2 text-sm"
                style={{ color: c.text, borderTop: i > 0 ? `1px solid ${c.divider}` : undefined }}
              >
                <Search size={14} style={{ color: c.textMuted }} />
                <span className="truncate">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Meus destinos */}
      {!isPegue && props.destinos.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium px-1" style={{ color: c.textMuted }}>
            Destinos frequentes
          </div>
          <div className="space-y-1.5">
            {props.destinos.slice(0, 5).map((d) => {
              const dist =
                props.origemCoords && d.latitude && d.longitude
                  ? haversine(props.origemCoords.lat, props.origemCoords.lng, d.latitude, d.longitude)
                  : null;
              const menuOpen = openMenu === d.id;
              return (
                <div key={d.id} className="relative">
                  <button
                    onClick={() => props.pickDestino(d)}
                    className="w-full text-left rounded-2xl px-3 py-2.5 flex items-center gap-2.5 text-sm"
                    style={{ background: c.cardBg, color: c.text }}
                  >
                    {d.favorito ? (
                      <Star size={16} style={{ color: "#FFD700", fill: "#FFD700" }} />
                    ) : (
                      <Clock size={16} style={{ color: c.textMuted }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">
                        {d.nome || d.endereco}
                      </div>
                      {d.nome && (
                        <div className="truncate text-[11px]" style={{ color: c.textMuted }}>
                          {d.endereco}
                        </div>
                      )}
                    </div>
                    {dist !== null && (
                      <span className="text-[11px] shrink-0" style={{ color: c.textMuted }}>
                        {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                      </span>
                    )}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(menuOpen ? null : d.id);
                      }}
                      className="p-1 rounded-full cursor-pointer"
                      style={{ color: c.textMuted }}
                      aria-label="Opções"
                    >
                      <MoreHorizontal size={16} />
                    </span>
                  </button>
                  {menuOpen && (
                    <div
                      className="absolute right-2 top-full mt-1 rounded-xl shadow-xl overflow-hidden z-40 min-w-[160px]"
                      style={{ background: c.cardBg, border: `1px solid ${c.divider}` }}
                    >
                      <button
                        onClick={() => {
                          setOpenMenu(null);
                          props.onRenameDestino(d.id, d.nome);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:opacity-80"
                        style={{ color: c.text }}
                      >
                        Renomear
                      </button>
                      <button
                        onClick={() => {
                          setOpenMenu(null);
                          props.onToggleFavorito(d.id, d.favorito);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:opacity-80"
                        style={{ color: c.text, borderTop: `1px solid ${c.divider}` }}
                      >
                        {d.favorito ? "Desfavoritar" : "Favoritar"}
                      </button>
                      <button
                        onClick={() => {
                          setOpenMenu(null);
                          props.onRemoveDestino(d.id);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:opacity-80"
                        style={{ color: "#ff6b6b", borderTop: `1px solid ${c.divider}` }}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pegue Ali: descrição + foto + pagamento */}
      {isPegue && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium px-1 block mb-1" style={{ color: c.textMuted }}>
              O que buscar?
            </span>
            <textarea
              value={props.pegueDescricao}
              onChange={(e) => props.setPegueDescricao(e.target.value.slice(0, 150))}
              placeholder={PLACEHOLDERS[phIdx]}
              rows={3}
              maxLength={150}
              className="w-full rounded-2xl p-3 text-sm outline-none resize-none"
              style={{ background: c.cardBg, color: c.text, border: `1px solid ${c.divider}` }}
            />
            <div className="text-[10px] text-right px-1 mt-0.5" style={{ color: c.textMuted }}>
              {props.pegueDescricao.length}/150
            </div>
          </label>

          <label
            className="rounded-2xl p-3 flex items-center gap-3 cursor-pointer"
            style={{ background: c.cardBg }}
          >
            {props.pegueFotoPreview ? (
              <img
                src={props.pegueFotoPreview}
                alt="anexo"
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <span className="text-2xl"><EmojiIcon e="📎" /></span>
            )}
            <span className="text-sm flex-1" style={{ color: c.text }}>
              {props.pegueFoto ? props.pegueFoto.name : "Anexar foto (opcional)"}
            </span>
            {props.pegueFoto && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  props.onPickFoto(null);
                }}
                className="text-xs px-2 py-1 rounded-full"
                style={{ background: c.inputBg, color: c.text }}
              >
                remover
              </button>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                props.onPickFoto(f);
              }}
            />
          </label>

          <div>
            <div className="text-xs font-medium px-1 mb-1.5" style={{ color: c.textMuted }}>
              Precisa pagar no local?
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(
                [
                  {
                    id: "pago" as const,
                    title: "JÁ ESTÁ PAGO",
                    sub: "Só precisa buscar",
                  },
                  {
                    id: "na_hora" as const,
                    title: "PAGAR NA HORA",
                    sub: "Mototaxista adianta, você paga direto pra ele na entrega",
                  },
                ] as const
              ).map((opt) => {
                const active = props.peguePagamento === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => props.setPeguePagamento(opt.id)}
                    className="rounded-2xl p-3 text-left transition"
                    style={{
                      background: active ? c.btn : c.cardBg,
                      color: active ? c.btnText : c.text,
                      border: `1px solid ${active ? c.btn : c.divider}`,
                    }}
                  >
                    <div className="text-sm font-bold">{opt.title}</div>
                    <div className="text-[11px] mt-0.5 opacity-80">{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {props.peguePagamento === "na_hora" && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-xs font-medium px-1 block mb-1" style={{ color: c.textMuted }}>
                  Valor estimado (R$)
                </span>
                <input
                  value={props.pegueValorLocal}
                  onChange={(e) => props.setPegueValorLocal(e.target.value.replace(/[^\d.,]/g, ""))}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-2xl p-3 text-sm outline-none"
                  style={{ background: c.cardBg, color: c.text, border: `1px solid ${c.divider}` }}
                />
              </label>
              <div
                className="rounded-xl p-3 text-[12px] leading-snug"
                style={{
                  background: "rgba(255, 200, 0, 0.12)",
                  border: "1px solid rgba(255, 200, 0, 0.35)",
                  color: c.text,
                }}
              >
                <EmojiIcon e="⚠️" /> O app <b>NÃO</b> processa esse pagamento. Você paga direto ao mototaxista em dinheiro ou Pix quando ele entregar.
              </div>
            </div>
          )}

          {props.peguePagamento === "pago" && (
            <label className="block">
              <span className="text-xs font-medium px-1 block mb-1" style={{ color: c.textMuted }}>
                Em nome de… (opcional)
              </span>
              <input
                value={props.pegueEmNomeDe}
                onChange={(e) => props.setPegueEmNomeDe(e.target.value.slice(0, 80))}
                placeholder="Nome da pessoa que reservou"
                className="w-full rounded-2xl p-3 text-sm outline-none"
                style={{ background: c.cardBg, color: c.text, border: `1px solid ${c.divider}` }}
              />
            </label>
          )}

          <div className="text-xs font-medium px-1" style={{ color: c.textMuted }}>
            Entregar em:
          </div>
        </div>
      )}

      <div className="text-xs font-semibold px-1" style={{ color: c.text }}>
        Entregar em:
      </div>

      <button
        type="button"
        onClick={() => props.setEntregaModo("meu_endereco")}
        className="w-full text-left rounded-2xl px-3 py-2.5 flex items-center gap-2.5 text-sm transition active:scale-[0.99]"
        style={{
          background: props.entregaModo === "meu_endereco" ? "rgba(61,181,74,0.08)" : c.cardBg,
          border: `1px solid ${props.entregaModo === "meu_endereco" ? c.btn : c.divider}`,
          color: c.text,
        }}
      >
        <MapPin size={16} style={{ color: c.btn }} />
        <div className="flex-1 min-w-0">
          <div className="font-medium">Trazer para meu endereço</div>
          <div className="truncate text-[11px]" style={{ color: c.textMuted }}>
            {props.meuEndereco ?? "Identificando seu endereço…"}
          </div>
        </div>
      </button>

      <div className="text-xs font-medium px-1" style={{ color: c.textMuted }}>
        Ou levar em:
      </div>

      <div className="flex flex-wrap gap-1.5">
        {props.orgaos.map((o) => {
          const active = props.entregaModo === "orgao" && props.orgaoDestino === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => props.onPickOrgaoDestino(o)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] flex items-center gap-1.5"
              style={{
                background: active ? c.btn : c.cardBg,
                color: active ? c.btnText : c.text,
                border: `1px solid ${active ? c.btn : c.divider}`,
              }}
            >
              {props.buscandoLugar === o && <Loader2 size={12} className="animate-spin" />}
              {o}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => props.setEntregaModo("outro")}
          className="rounded-full px-3 py-1.5 text-xs font-medium"
          style={{
            background: props.entregaModo === "outro" ? c.btn : c.cardBg,
            color: props.entregaModo === "outro" ? c.btnText : c.text,
            border: `1px solid ${props.entregaModo === "outro" ? c.btn : c.divider}`,
          }}
        >
          Outro local
        </button>
      </div>

      {/* Destino (livre) */}
      {props.entregaModo === "outro" && (
      <div className="relative">
        <div
          className="rounded-2xl p-3 flex items-center gap-2"
          style={{ background: c.cardBg }}
        >
          <Navigation size={18} style={{ color: c.btn }} />
          <input
            value={props.destino}
            onChange={(e) => props.setDestino(e.target.value)}
            onFocus={() => props.setDestFocused(true)}
            onBlur={() => setTimeout(() => props.setDestFocused(false), 150)}
            placeholder="Local de entrega — ex.: PSF Bombinha"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: c.text }}
          />
          {props.searchingDest && <Loader2 size={14} className="animate-spin opacity-60" />}
          {props.destino && (
            <button
              onClick={() => props.setDestino("")}
              className="p-1 rounded-full"
              style={{ color: c.textMuted }}
              aria-label="Limpar"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {props.destFocused && props.destSug.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 rounded-2xl shadow-xl overflow-hidden z-30 max-h-72 overflow-y-auto"
            style={{ background: c.cardBg, border: `1px solid ${c.divider}` }}
          >
            {props.destSug.map((s, i) => (
              <button
                key={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => props.pickDestSuggestion(s)}
                className="w-full text-left px-3 py-2 hover:opacity-80 flex items-center gap-2 text-sm"
                style={{ color: c.text, borderTop: i > 0 ? `1px solid ${c.divider}` : undefined }}
              >
                <Search size={14} style={{ color: c.textMuted }} />
                <span className="truncate">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Sala e responsável */}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs font-medium px-1 block mb-1" style={{ color: c.textMuted }}>
            Entregar em sala de:
          </span>
          <input
            value={props.sala}
            onChange={(e) => props.setSala(e.target.value.slice(0, 60))}
            placeholder="Ex.: Sala 02 — Recepção"
            className="w-full rounded-2xl p-3 text-sm outline-none"
            style={{ background: c.cardBg, color: c.text, border: `1px solid ${c.divider}` }}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium px-1 block mb-1" style={{ color: c.textMuted }}>
            Responsável:
          </span>
          <input
            value={props.responsavel}
            onChange={(e) => props.setResponsavel(e.target.value.slice(0, 60))}
            placeholder="Ex.: Maria Silva"
            className="w-full rounded-2xl p-3 text-sm outline-none"
            style={{ background: c.cardBg, color: c.text, border: `1px solid ${c.divider}` }}
          />
        </label>
      </div>




      {/* Observação */}
      <label className="block">
        <span className="text-xs font-medium px-1 block mb-1" style={{ color: c.textMuted }}>
          Observação (opcional)
        </span>
        <textarea
          value={props.observacao}
          onChange={(e) => props.setObservacao(e.target.value.slice(0, 180))}
          placeholder="Ex.: Reposição de medicamentos"
          rows={2}
          className="w-full rounded-2xl p-3 text-sm outline-none resize-none"
          style={{ background: c.cardBg, color: c.text, border: `1px solid ${c.divider}` }}
        />
      </label>

      {/* Tarifa */}
      {(props.tarifaInfo || props.calculatingTarifa) && props.destinoCoords && (
        <div
          className="rounded-2xl p-3 space-y-1.5 text-sm"
          style={{ background: c.cardBg, color: c.text }}
        >
          {props.calculatingTarifa && (
            <div className="flex items-center gap-2 text-xs" style={{ color: c.textMuted }}>
              <Loader2 size={14} className="animate-spin" /> Calculando tarifa...
            </div>
          )}
          {props.tarifaInfo && !props.calculatingTarifa && (
            <>
              <div className="flex items-center justify-between">
                <span><EmojiIcon e="🏷️" /> Tarifa base</span>
                <span>{formatBRL(props.tarifaInfo.valor)}</span>
              </div>
              {props.tarifaInfo.adicional > 0 && (
                <div className="flex items-center justify-between">
                  <span><EmojiIcon e="⚡" /> Taxa InterGO</span>
                  <span>+{formatBRL(props.tarifaInfo.adicional)}</span>
                </div>
              )}
              <div
                className="flex items-center justify-between pt-1.5 mt-1.5 font-semibold text-base"
                style={{ borderTop: `1px solid ${c.divider}` }}
              >
                <span><EmojiIcon e="💰" /> Total</span>
                <span>
                  {props.ehGratuita ? (
                    <span style={{ color: c.btn }}><EmojiIcon e="🎁" /> GRÁTIS</span>
                  ) : (
                    formatBRL(props.tarifaInfo.total)
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {props.destinoCoords && !props.tarifaInfo && !props.calculatingTarifa && (
        <div className="text-xs text-center" style={{ color: c.textMuted }}>
          <EmojiIcon e="💬" /> Valor a combinar com o mototaxista
        </div>
      )}

      <button
        onClick={isPegue ? props.onPegueSubmit : props.onCall}
        disabled={isPegue ? props.pegueSubmitting || !canCall : !canCall}
        className="w-full rounded-2xl py-4 font-bold text-base shadow-lg active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: c.btn,
          color: c.btnText,
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: 1,
        }}
      >
        {isPegue
          ? props.pegueSubmitting
            ? "ENVIANDO…"
            : "ENVIAR PEDIDO"
          : "SOLICITAR TRANSPORTE"}
      </button>
      {!canCall && (
        <div className="text-xs text-center" style={{ color: c.textMuted }}>
          Escolha o tipo, o local de coleta e o local de entrega.
        </div>
      )}
    </div>
  );
}

function WaitingPanel({ c, onCancel, countdown }: { c: C; onCancel: () => void; countdown: number }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <Bubble c={c} role="system">
        <div className="flex items-center gap-2">
          <span><EmojiIcon e="🔍" /> Procurando mototaxista próximo (aguarde {countdown}s)</span>
          <span className="flex gap-1">
            <span className="dot-pulse" />
            <span className="dot-pulse" style={{ animationDelay: "0.15s" }} />
            <span className="dot-pulse" style={{ animationDelay: "0.3s" }} />
          </span>
        </div>
      </Bubble>
      <button
        onClick={onCancel}
        className="text-xs underline opacity-75"
        style={{ color: c.textMuted }}
      >
        Cancelar
      </button>
      <style>{`
        .dot-pulse{display:inline-block;width:6px;height:6px;border-radius:50%;background:${c.btn};animation:mzpulse 1s infinite;}
        @keyframes mzpulse{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1.1)}}
      `}</style>
    </div>
  );
}

function DriverPanel({
  c,
  moto,
  passageiroPos,
  chegou,
  onEmbarquei,
  onCancel,
}: {
  c: C;
  moto: NonNullable<ReturnType<typeof useDummy>>;
  passageiroPos: { lat: number; lng: number } | null;
  chegou: boolean;
  onEmbarquei: () => void;
  onCancel: () => void;
}) {
  const dist =
    moto.latitude && moto.longitude && passageiroPos
      ? haversine(
          passageiroPos.lat,
          passageiroPos.lng,
          Number(moto.latitude),
          Number(moto.longitude),
        )
      : null;
  const mins = dist != null ? Math.max(1, Math.round((dist / 25) * 60)) : null;
  const planoBadge =
    moto.plano === "ouro" ? "OURO" : moto.plano === "prata" ? "PRATA" : null;

  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl p-3 flex items-center gap-3"
        style={{ background: c.cardBg }}
      >
        <div
          className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
          style={{
            width: 56,
            height: 56,
            background: c.inputBg,
            border: `2px solid ${c.btn}`,
          }}
        >
          {moto.foto_url ? (
            <img src={moto.foto_url} alt={moto.nome} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl"><EmojiIcon e="🏍️" /></span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold truncate" style={{ color: c.text }}>
              {moto.nome}
            </span>
            {planoBadge && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: c.btn, color: c.btnText }}
              >
                {planoBadge}
              </span>
            )}
          </div>
          <div className="text-xs" style={{ color: c.textMuted }}>
            {moto.moto_modelo ?? "Moto"} • {moto.moto_placa ?? "—"}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: c.textMuted }}>
            <span className="flex items-center gap-0.5">
              <Star size={12} fill="#FFB400" stroke="#FFB400" />
              {moto.nota_media ? Number(moto.nota_media).toFixed(1) : "—"}
            </span>
            {mins != null && !chegou && <span>• {mins} min até você</span>}
          </div>
        </div>
      </div>

      {!chegou ? (
        <Bubble c={c} role="system">
          <EmojiIcon e="✅" /> {moto.nome.split(" ")[0]} aceitou sua corrida!
          {mins != null && `\nEle está a ${mins} minutos de você.`}
        </Bubble>
      ) : (
        <Bubble c={c} role="system">
          <EmojiIcon e="📍" /> {moto.nome.split(" ")[0]} chegou até você!
        </Bubble>
      )}

      <div className="flex gap-2">
        <a
          href={whatsappLink(moto.telefone, "Oi, sou seu passageiro do InterGO!") || "#"}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-xl py-2.5 text-center text-sm font-medium flex items-center justify-center gap-1.5"
          style={{ background: c.cardBg, color: c.text }}
        >
          <Phone size={14} /> WhatsApp
        </a>
        {!chegou && (
          <button
            onClick={onCancel}
            className="px-4 rounded-xl text-sm font-medium"
            style={{ background: c.cardBg, color: "#E74C3C" }}
          >
            Cancelar
          </button>
        )}
      </div>

      {chegou && (
        <button
          onClick={onEmbarquei}
          className="w-full rounded-2xl py-4 font-bold text-base shadow-lg active:scale-[0.98] transition"
          style={{
            background: c.btn,
            color: c.btnText,
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: 1,
          }}
        >
          <EmojiIcon e="✅" /> EMBARQUEI
        </button>
      )}
    </div>
  );
}

function InProgressPanel({
  c,
  moto,
  nomePassageiro,
}: {
  c: C;
  moto: NonNullable<ReturnType<typeof useDummy>>;
  nomePassageiro: string;
}) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl p-2.5 flex items-center gap-2"
        style={{ background: c.cardBg }}
      >
        <div
          className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
          style={{ width: 36, height: 36, background: c.inputBg }}
        >
          {moto.foto_url ? (
            <img src={moto.foto_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span><EmojiIcon e="🏍️" /></span>
          )}
        </div>
        <div className="min-w-0 flex-1 text-xs">
          <div className="font-semibold truncate" style={{ color: c.text }}>
            {moto.nome}
          </div>
          <div style={{ color: c.textMuted }}>{moto.moto_placa ? formatarPlaca(moto.moto_placa) : "Em viagem"}</div>
        </div>
        <a
          href={whatsappLink(moto.telefone, "") || "#"}
          target="_blank"
          rel="noreferrer"
          className="p-2 rounded-full"
          style={{ background: c.btn, color: c.btnText }}
          aria-label="WhatsApp"
        >
          <Phone size={14} />
        </a>
      </div>
      <Bubble c={c} role="system">
        <EmojiIcon e="🏍️" /><EmojiIcon e="💨" /> Boa viagem, {nomePassageiro.split(" ")[0]}!
      </Bubble>
    </div>
  );
}

function RatePanel({
  c,
  valor,
  nota,
  setNota,
  comentario,
  setComentario,
  onSend,
}: {
  c: C;
  valor: number;
  nota: number;
  setNota: (n: number) => void;
  comentario: string;
  setComentario: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="space-y-3">
      <Bubble c={c} role="system">
        <EmojiIcon e="🎉" /> Você chegou!{"\n"}Valor: {formatBRL(valor)}
        {"\n"}Como foi sua corrida?
      </Bubble>
      <div className="flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setNota(n)} aria-label={`${n} estrelas`}>
            <Star
              size={36}
              fill={n <= nota ? "#FFB400" : "transparent"}
              stroke={n <= nota ? "#FFB400" : c.textMuted}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Deixe um comentário (opcional)"
        rows={2}
        className="w-full rounded-2xl p-3 text-sm outline-none resize-none"
        style={{ background: c.cardBg, color: c.text }}
      />
      <button
        onClick={onSend}
        className="w-full rounded-2xl py-3.5 font-bold shadow-lg active:scale-[0.98] transition"
        style={{
          background: c.btn,
          color: c.btnText,
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: 1,
        }}
      >
        ENVIAR AVALIAÇÃO
      </button>
    </div>
  );
}

function DonePanel({ c, faltam, onNew }: { c: C; faltam: number; onNew: () => void }) {
  return (
    <div className="space-y-3">
      <Bubble c={c} role="system">
        Obrigado! <EmojiIcon e="😊" />{"\n"}
        {faltam > 0
          ? `Faltam ${faltam} corridas para sua próxima grátis! `
          : "Sua próxima corrida é grátis!"}
      </Bubble>
      <button
        onClick={onNew}
        className="w-full rounded-2xl py-3.5 font-bold shadow-lg active:scale-[0.98] transition"
        style={{
          background: c.btn,
          color: c.btnText,
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: 1,
        }}
      >
        <EmojiIcon e="🏍️" /> NOVA CORRIDA
      </button>
    </div>
  );
}

// type helper
function useDummy() {
  return null as null | {
    id: string;
    nome: string;
    telefone: string;
    foto_url: string | null;
    plano: string | null;
    moto_modelo: string | null;
    moto_placa: string | null;
    nota_media: number | null;
    latitude: number | null;
    longitude: number | null;
  };
}

// Haversine em km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function NoDriversModal({
  c,
  reason,
  onRetry,
  onNotify,
  onClose,
}: {
  c: C;
  reason: "initial" | "timeout";
  onRetry: () => void;
  onNotify: () => void;
  onClose: () => void;
}) {
  const isTimeout = reason === "timeout";
  const titulo = isTimeout ? "Nenhum mototaxista disponível agora" : "Ops!";
  const msg = isTimeout
    ? "Todos os motoristas próximos estão ocupados. Tente novamente ou aumente a distância de busca."
    : "Nesse momento não temos nenhum mototaxista disponível em sua localização.";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center animate-in fade-in zoom-in-95"
        style={{ background: c.cardBg, color: c.text }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-3"><EmojiIcon e="😔" /></div>
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: c.text, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}
        >
          {titulo}
        </h2>
        <p className="text-sm mb-5" style={{ color: c.text }}>
          {msg}
        </p>

        <button
          onClick={onRetry}
          className="w-full rounded-2xl py-3.5 font-bold shadow-lg active:scale-[0.98] transition mb-2"
          style={{
            background: "#3DB54A",
            color: "#FFFFFF",
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: 1,
          }}
        >
          {isTimeout ? "TENTAR DE NOVO" : "TENTAR NOVAMENTE"}
        </button>
        <button
          onClick={isTimeout ? onClose : onNotify}
          className="w-full rounded-2xl py-3 text-sm font-medium"
          style={{
            background: "transparent",
            color: c.textMuted,
            border: `1px solid ${c.divider}`,
          }}
        >
          {isTimeout ? "Cancelar corrida" : "Avisar quando disponível"}
        </button>
      </div>
    </div>
  );
}
