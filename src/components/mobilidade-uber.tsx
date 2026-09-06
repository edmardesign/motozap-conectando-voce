import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ChevronLeft, Crosshair, Loader2, MapPin, Search, X, Phone, Star } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { reverseGeocode, searchSuggestions, type NominatimResult } from "@/lib/geocoding";
import { haversineKm } from "@/lib/haversine";
import { formatBRL } from "@/lib/pricing";

export type ModalidadeMobilidade = "automovel" | "moto_taxi";

interface Props {
  modalidade: ModalidadeMobilidade;
}

type Coords = { lat: number; lng: number };

type Corrida = {
  id: string;
  status: string;
  mototaxista_id: string | null;
  valor_estimado: number;
};

type MotoristaInfo = {
  nome: string;
  telefone: string;
  foto_url: string | null;
  modelo: string | null;
  placa: string | null;
  latitude: number | null;
  longitude: number | null;
};

const TARIFAS: Record<ModalidadeMobilidade, { base: number; porKm: number; label: string; confirmar: string }> = {
  automovel: { base: 6, porKm: 2.5, label: "Automóvel", confirmar: "Confirmar Automóvel" },
  moto_taxi: { base: 4, porKm: 1.5, label: "Moto Táxi", confirmar: "Confirmar Moto Táxi" },
};

const pinIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 0 0 4px ${color}33"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

function Recenter({ to, zoom = 15 }: { to: Coords | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.setView([to.lat, to.lng], zoom, { animate: true });
  }, [to?.lat, to?.lng]); // eslint-disable-line
  return null;
}

export function MobilidadeUber({ modalidade }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tarifa = TARIFAS[modalidade];

  const [origemCoords, setOrigemCoords] = useState<Coords | null>(null);
  const [origem, setOrigem] = useState("");
  const [buscandoGps, setBuscandoGps] = useState(true);

  const [destino, setDestino] = useState("");
  const [destinoCoords, setDestinoCoords] = useState<Coords | null>(null);
  const [sugestoes, setSugestoes] = useState<NominatimResult[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [painelDestino, setPainelDestino] = useState(false);

  const [corrida, setCorrida] = useState<Corrida | null>(null);
  const [motorista, setMotorista] = useState<MotoristaInfo | null>(null);
  const [enviando, setEnviando] = useState(false);

  // ---- GPS: origem automática ----
  const detectarLocalizacao = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setBuscandoGps(false);
      return;
    }
    setBuscandoGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOrigemCoords(c);
        const r = await reverseGeocode(c.lat, c.lng);
        setOrigem(r?.display_name ?? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`);
        setBuscandoGps(false);
      },
      () => {
        setBuscandoGps(false);
        toast.error("Não conseguimos obter sua localização. Informe o ponto de partida.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, []);

  useEffect(() => {
    detectarLocalizacao();
  }, [detectarLocalizacao]);

  // ---- Autocomplete de destino ----
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (destino.trim().length < 3 || destinoCoords) {
      setSugestoes([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setBuscando(true);
      const r = await searchSuggestions(destino, "", "");
      setSugestoes(r);
      setBuscando(false);
    }, 600);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [destino, destinoCoords]);

  const distanciaKm = useMemo(() => {
    if (!origemCoords || !destinoCoords) return null;
    return haversineKm(origemCoords, destinoCoords);
  }, [origemCoords, destinoCoords]);

  const tempoMin = distanciaKm == null ? null : Math.max(4, Math.round(distanciaKm * (modalidade === "moto_taxi" ? 2.2 : 3)));
  const valor = distanciaKm == null ? null : Math.round((tarifa.base + distanciaKm * tarifa.porKm) * 100) / 100;

  async function confirmar() {
    if (!user) {
      toast.error("Entre na sua conta para solicitar.");
      return;
    }
    if (!destinoCoords || valor == null) return;
    setEnviando(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("cidade,estado")
        .eq("id", user.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from("corridas")
        .insert({
          passageiro_id: user.id,
          tipo: modalidade,
          origem_endereco: origem || "Localização atual",
          destino_endereco: destino,
          origem_lat: origemCoords?.lat ?? null,
          origem_lng: origemCoords?.lng ?? null,
          destino_lat: destinoCoords.lat,
          destino_lng: destinoCoords.lng,
          valor_estimado: valor,
          eh_gratuita: false,
          pagamento_tipo: "dinheiro",
          status: "aguardando" as const,
          distancia_km: distanciaKm,
          cidade: (profile as any)?.cidade ?? null,
          estado: (profile as any)?.estado ?? null,
          descricao: `Mobilidade urbana — ${tarifa.label}`,
        } as any)
        .select("id,status,mototaxista_id,valor_estimado")
        .single();

      if (error) {
        toast.error(error.message);
        return;
      }
      setCorrida(data as Corrida);
      toast.success("Solicitação enviada! Procurando motorista…");
    } finally {
      setEnviando(false);
    }
  }

  // ---- Realtime da corrida ----
  useEffect(() => {
    if (!corrida) return;
    const ch = supabase
      .channel(`mobilidade-${corrida.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "corridas", filter: `id=eq.${corrida.id}` },
        (payload) => {
          const n = payload.new as any;
          setCorrida((p) => (p ? { ...p, status: n.status, mototaxista_id: n.mototaxista_id } : p));
          if (n.status === "cancelada") {
            toast.message("Corrida cancelada");
            setCorrida(null);
            setMotorista(null);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [corrida?.id]); // eslint-disable-line

  // ---- Dados do motorista + posição em tempo real ----
  useEffect(() => {
    const id = corrida?.mototaxista_id;
    if (!id) {
      setMotorista(null);
      return;
    }
    let cancel = false;
    (async () => {
      const { data } = await (supabase as any).rpc("get_mototaxista_publico", { _id: id });
      const info = Array.isArray(data) ? data[0] : data;
      if (cancel || !info) return;
      setMotorista({
        nome: info.nome ?? "Motorista",
        telefone: info.telefone ?? "",
        foto_url: info.foto_url ?? null,
        modelo: info.modelo_moto ?? null,
        placa: info.placa_moto ?? null,
        latitude: info.latitude ?? null,
        longitude: info.longitude ?? null,
      });
    })();
    const ch = supabase
      .channel(`mobilidade-motorista-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mototaxistas", filter: `id=eq.${id}` },
        (payload) => {
          const n = payload.new as any;
          setMotorista((p) => (p ? { ...p, latitude: n.latitude ?? p.latitude, longitude: n.longitude ?? p.longitude } : p));
        },
      )
      .subscribe();
    return () => {
      cancel = true;
      supabase.removeChannel(ch);
    };
  }, [corrida?.mototaxista_id]);

  const motoCoords: Coords | null =
    motorista?.latitude != null && motorista?.longitude != null
      ? { lat: Number(motorista.latitude), lng: Number(motorista.longitude) }
      : null;

  const etaMotorista =
    motoCoords && origemCoords ? Math.max(1, Math.round(haversineKm(motoCoords, origemCoords) * 3)) : null;

  async function cancelar() {
    if (!corrida) return;
    await supabase.from("corridas").update({ status: "cancelada" }).eq("id", corrida.id);
    setCorrida(null);
    setMotorista(null);
  }

  const centro = origemCoords ?? { lat: -14.235, lng: -51.9253 };

  return (
    <div className="fixed inset-0 flex flex-col bg-white font-sans text-[#111111]">
      {/* Mapa em tela cheia */}
      <div className="absolute inset-0">
        <MapContainer
          center={[centro.lat, centro.lng]}
          zoom={origemCoords ? 15 : 4}
          zoomControl={false}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter to={origemCoords} />
          {origemCoords && <Marker position={[origemCoords.lat, origemCoords.lng]} icon={pinIcon("#2F80ED")} />}
          {destinoCoords && <Marker position={[destinoCoords.lat, destinoCoords.lng]} icon={pinIcon("#3DB54A")} />}
          {motoCoords && <Marker position={[motoCoords.lat, motoCoords.lng]} icon={pinIcon("#111111")} />}
          {origemCoords && destinoCoords && (
            <Polyline
              positions={[
                [origemCoords.lat, origemCoords.lng],
                [destinoCoords.lat, destinoCoords.lng],
              ]}
              pathOptions={{ color: "#3DB54A", weight: 5, opacity: 0.85 }}
            />
          )}
        </MapContainer>
      </div>

      {/* Voltar */}
      <button
        aria-label="Voltar"
        onClick={() => navigate({ to: "/passageiro/mobilidade" })}
        className="absolute left-4 top-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg"
      >
        <ChevronLeft size={22} />
      </button>

      <button
        aria-label="Centralizar na minha localização"
        onClick={detectarLocalizacao}
        className="absolute right-4 top-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg"
      >
        {buscandoGps ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={20} />}
      </button>

      {/* Painel inferior */}
      <div className="absolute inset-x-0 bottom-0 z-[1000] rounded-t-[24px] bg-white p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        {!corrida ? (
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
              <MapPin size={16} className="text-[#2F80ED]" />
              <span className="line-clamp-1">{buscandoGps ? "Detectando sua localização…" : origem || "Defina o ponto de partida"}</span>
            </div>

            <button
              onClick={() => setPainelDestino(true)}
              className="flex w-full items-center gap-3 rounded-2xl bg-[#F5F5F7] px-4 py-4 text-left"
            >
              <Search size={20} className="text-[#6B6B6B]" />
              <span className={destino ? "font-semibold" : "text-[#6B6B6B]"}>{destino || "Para onde?"}</span>
            </button>

            {destinoCoords && valor != null && (
              <div className="rounded-2xl border border-[#E8E8E8] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{tarifa.label}</p>
                    <p className="text-xs text-[#6B6B6B]">
                      {distanciaKm} km · aprox. {tempoMin} min
                    </p>
                  </div>
                  <p className="text-lg font-bold text-[#3DB54A]">{formatBRL(valor)}</p>
                </div>
              </div>
            )}

            <button
              disabled={!destinoCoords || enviando}
              onClick={confirmar}
              className="w-full rounded-2xl bg-[#3DB54A] py-4 font-bold text-white disabled:opacity-40"
            >
              {enviando ? "Enviando…" : tarifa.confirmar}
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            {!motorista ? (
              <div className="flex items-center gap-3">
                <Loader2 size={22} className="animate-spin text-[#3DB54A]" />
                <div>
                  <p className="font-bold">Procurando motorista…</p>
                  <p className="text-sm text-[#6B6B6B]">Aguarde, já já alguém aceita sua corrida.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#F5F5F7]">
                  {motorista.foto_url ? (
                    <img src={motorista.foto_url} alt={motorista.nome} className="h-full w-full object-cover" />
                  ) : (
                    <Star size={22} className="text-[#6B6B6B]" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{motorista.nome}</p>
                  <p className="text-sm text-[#6B6B6B]">
                    {[motorista.modelo, motorista.placa].filter(Boolean).join(" · ") || tarifa.label}
                  </p>
                  {etaMotorista != null && (
                    <p className="text-sm font-semibold text-[#3DB54A]">Chega em ~{etaMotorista} min</p>
                  )}
                </div>
                {motorista.telefone && (
                  <a
                    href={`tel:${motorista.telefone}`}
                    aria-label="Ligar para o motorista"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F5F7]"
                  >
                    <Phone size={18} />
                  </a>
                )}
              </div>
            )}
            <button onClick={cancelar} className="w-full rounded-2xl border border-[#E8E8E8] py-3 font-semibold">
              Cancelar corrida
            </button>
          </div>
        )}
      </div>

      {/* Painel de destino */}
      {painelDestino &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[2000] flex flex-col bg-white p-5 font-sans text-[#111111]">
            <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
              <div className="flex items-center gap-3">
                <button
                  aria-label="Fechar busca de destino"
                  onClick={() => setPainelDestino(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F7]"
                >
                  <X size={18} />
                </button>
                <h2 className="text-lg font-bold">Para onde?</h2>
              </div>
              <input
                autoFocus
                value={destino}
                onChange={(e) => {
                  setDestino(e.target.value);
                  setDestinoCoords(null);
                }}
                placeholder="Digite o endereço de destino"
                className="w-full rounded-2xl bg-[#F5F5F7] px-4 py-4 outline-none"
              />
              {buscando && <p className="text-sm text-[#6B6B6B]">Buscando endereços…</p>}
              <div className="flex flex-col divide-y divide-[#F0F0F0]">
                {sugestoes.map((s) => (
                  <button
                    key={`${s.lat}-${s.lon}`}
                    onClick={() => {
                      setDestino(s.display_name);
                      setDestinoCoords({ lat: Number(s.lat), lng: Number(s.lon) });
                      setSugestoes([]);
                      setPainelDestino(false);
                    }}
                    className="flex items-start gap-3 py-3 text-left"
                  >
                    <MapPin size={18} className="mt-0.5 shrink-0 text-[#3DB54A]" />
                    <span className="text-sm">{s.display_name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
