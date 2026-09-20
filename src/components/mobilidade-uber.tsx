import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, Polyline, Polygon, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNavigate } from "@tanstack/react-router";
import { Crosshair, Loader2, MapPin, Search, X, Phone, Star, AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { reverseGeocode, searchSuggestions, type NominatimResult } from "@/lib/geocoding";
import { haversineKm } from "@/lib/haversine";
import { AVISO_MOBILIDADE } from "@/components/aviso-mobilidade";
import { OrigemDestinoPanel, IconesOpcao } from "@/components/origem-destino-panel";
import { PassageiroHeader } from "@/components/passageiro-header";
import { PassageiroTabBar } from "@/components/passageiro-tab-bar";
import { cienciaMobilidadeHoje, registrarCienciaMobilidade } from "@/lib/mobilidade-auditoria.functions";
import {
  meuMunicipio,
  listarMunicipios,
  solicitarExcecao,
  type MeuMunicipio,
} from "@/lib/municipios.functions";
import {
  gravarCache,
  lerCache,
  poligonoParaLeaflet,
  pontoPermitido,
  viewboxDe,
} from "@/lib/municipio-geo";



export type ModalidadeMobilidade = "automovel" | "moto_taxi";

interface Props {
  modalidade: ModalidadeMobilidade;
  agendamento?: { agendar?: boolean; data?: string; hora?: string };
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

// Serviço público: sem tarifa. Apenas rótulos por modalidade.
const TARIFAS: Record<ModalidadeMobilidade, { label: string; confirmar: string }> = {
  automovel: { label: "Automóvel", confirmar: "Confirmar Automóvel" },
  moto_taxi: { label: "Moto Táxi", confirmar: "Confirmar Moto Táxi" },
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

export function MobilidadeUber({ modalidade, agendamento }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tarifa = TARIFAS[modalidade];
  const agendado = Boolean(agendamento?.data && agendamento?.hora);
  const scheduledAt = agendado
    ? `${new Date(`${agendamento!.data}T12:00:00`).toLocaleDateString("pt-BR")} às ${agendamento!.hora}`
    : undefined;

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

  // ---- Município de exercício (restrição geográfica) ----
  const carregarMunicipio = useServerFn(meuMunicipio);
  const [mun, setMun] = useState<MeuMunicipio | null>(() =>
    typeof window === "undefined" ? null : lerCache(),
  );
  const [gpsForaDoMunicipio, setGpsForaDoMunicipio] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      try {
        const r = await carregarMunicipio();
        if (cancel) return;
        setMun(r);
        gravarCache(r);
      } catch {
        /* mantém o cache local; o banco valida no envio */
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user, carregarMunicipio]);

  const anelMunicipio = useMemo(() => (mun ? poligonoParaLeaflet(mun.geojson) : []), [mun]);

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
        if (!pontoPermitido(c.lat, c.lng, mun)) {
          setGpsForaDoMunicipio(true);
          setOrigemCoords(null);
          setOrigem("");
          setBuscandoGps(false);
          return;
        }
        setGpsForaDoMunicipio(false);
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
  }, [mun]);

  useEffect(() => {
    detectarLocalizacao();
  }, [detectarLocalizacao]);

  // ---- Autocomplete de destino (restrito ao município) ----
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (destino.trim().length < 3 || destinoCoords) {
      setSugestoes([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setBuscando(true);
      const r = await searchSuggestions(destino, mun?.name ?? "", mun?.uf ?? "", viewboxDe(mun));
      setSugestoes(r.filter((s) => pontoPermitido(Number(s.lat), Number(s.lon), mun)));
      setBuscando(false);
    }, 600);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [destino, destinoCoords, mun]);


  const distanciaKm = useMemo(() => {
    if (!origemCoords || !destinoCoords) return null;
    return haversineKm(origemCoords, destinoCoords);
  }, [origemCoords, destinoCoords]);

  const tempoMin = distanciaKm == null ? null : Math.max(4, Math.round(distanciaKm * (modalidade === "moto_taxi" ? 2.2 : 3)));

  // ---- Ciência do aviso institucional (1x por dia) ----
  const verificarCiencia = useServerFn(cienciaMobilidadeHoje);
  const registrarCiencia = useServerFn(registrarCienciaMobilidade);
  const [precisaCiencia, setPrecisaCiencia] = useState(false);
  const [modalCiencia, setModalCiencia] = useState(false);
  const [ciente, setCiente] = useState(false);
  const [salvandoCiencia, setSalvandoCiencia] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      try {
        const r = await verificarCiencia();
        if (!cancel) setPrecisaCiencia(!r.aceito);
      } catch {
        /* falha silenciosa: o aviso continua visível nas telas anteriores */
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user, verificarCiencia]);

  const destinoPermitido = useMemo(
    () => (destinoCoords ? pontoPermitido(destinoCoords.lat, destinoCoords.lng, mun) : true),
    [destinoCoords, mun],
  );

  // ---- Autorização especial para deslocamento fora do município ----
  const carregarMunicipios = useServerFn(listarMunicipios);
  const pedirExcecao = useServerFn(solicitarExcecao);
  const [modalExcecao, setModalExcecao] = useState(false);
  const [municipios, setMunicipios] = useState<Array<{ id: string; name: string; uf: string }>>([]);
  const [exMunicipio, setExMunicipio] = useState("");
  const [exMotivo, setExMotivo] = useState("");
  const [exData, setExData] = useState(() => new Date().toISOString().slice(0, 10));
  const [enviandoExcecao, setEnviandoExcecao] = useState(false);

  async function abrirExcecao() {
    setModalExcecao(true);
    if (municipios.length === 0) {
      try {
        const lista = await carregarMunicipios();
        setMunicipios(lista.filter((m) => m.id !== mun?.id));
      } catch {
        toast.error("Não foi possível carregar a lista de municípios.");
      }
    }
  }

  async function enviarExcecao() {
    setEnviandoExcecao(true);
    try {
      await pedirExcecao({ data: { municipio_id: exMunicipio, motivo: exMotivo, data: exData } });
      toast.success("Pedido enviado para análise da administração.");
      setModalExcecao(false);
      setExMotivo("");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível enviar o pedido.");
    } finally {
      setEnviandoExcecao(false);
    }
  }

  async function confirmar() {
    if (!user) {
      toast.error("Entre na sua conta para solicitar.");
      return;
    }
    if (!destinoCoords) return;
    if (!destinoPermitido) {
      toast.error("Destino fora do município de exercício.");
      return;
    }
    if (precisaCiencia) {
      setModalCiencia(true);
      return;
    }
    await enviarSolicitacao();
  }


  async function aceitarCiencia() {
    if (!ciente) return;
    setSalvandoCiencia(true);
    try {
      await registrarCiencia({ data: {} });
      setPrecisaCiencia(false);
      setModalCiencia(false);
      await enviarSolicitacao();
    } catch {
      toast.error("Não foi possível registrar sua confirmação agora.");
    } finally {
      setSalvandoCiencia(false);
    }
  }

  async function enviarSolicitacao() {
    if (!user || !destinoCoords) return;
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
          // Serviço público: mobilidade urbana não é cobrada do servidor.
          valor_estimado: 0,
          eh_gratuita: true,
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
        if (error.message.includes("LIMITE_MOBILIDADE_ATINGIDO")) {
          toast.error("Você atingiu o limite mensal de chamadas de mobilidade urbana.");
          navigate({ to: "/passageiro/mobilidade" });
          return;
        }
        if (error.message.includes("FORA_DO_MUNICIPIO_ORIGEM")) {
          toast.error("O ponto de partida está fora do seu município de exercício.");
          return;
        }
        if (error.message.includes("FORA_DO_MUNICIPIO_DESTINO")) {
          toast.error("O destino está fora do seu município de exercício.");
          void abrirExcecao();
          return;
        }
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

  const centro = origemCoords ?? (mun ? { lat: mun.centroid_lat, lng: mun.centroid_lng } : { lat: -14.235, lng: -51.9253 });

  return (
    <div className="fixed inset-0 flex flex-col bg-white font-sans text-[#111111]">
      {/* Mapa em tela cheia */}
      <div className="absolute inset-0">
        <MapContainer
          center={[centro.lat, centro.lng]}
          zoom={origemCoords ? 15 : mun ? 12 : 4}
          zoomControl={false}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter to={origemCoords ?? (mun ? { lat: mun.centroid_lat, lng: mun.centroid_lng } : null)} zoom={origemCoords ? 15 : 12} />
          {anelMunicipio.length > 0 && (
            <Polygon
              positions={anelMunicipio}
              pathOptions={{ color: "#3DB54A", weight: 2, opacity: 0.5, fillOpacity: 0.04 }}
            />
          )}
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

      <div className="absolute inset-x-0 top-0 z-[1000]">
        <PassageiroHeader backTo="/passageiro/mobilidade" title={tarifa.label} />
      </div>

      <button
        aria-label="Centralizar na minha localização"
        onClick={detectarLocalizacao}
        className="absolute right-4 top-[4.25rem] z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-lg"
      >
        {buscandoGps ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={20} />}
      </button>

      {/* Painel inferior */}
      <div className="absolute inset-x-0 bottom-16 z-[1000] rounded-t-3xl bg-card p-5 text-foreground shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        {!corrida ? (
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            {mun && (
              <p className="text-xs font-semibold uppercase tracking-wide text-[#3DB54A]">
                Você está em {mun.name} — {mun.uf}
              </p>
            )}

            <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
              <MapPin size={16} className="text-[#2F80ED]" />
              <span className="line-clamp-1">{buscandoGps ? "Detectando sua localização…" : origem || "Defina o ponto de partida"}</span>
            </div>

            {gpsForaDoMunicipio && (
              <div className="flex items-start gap-2 rounded-2xl bg-[#FFF7E6] p-3 text-xs text-[#7A5B00]">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  Sua localização atual está fora de {mun?.name ?? "seu município de exercício"}. Escolha um ponto
                  de partida dentro do município.
                </span>
              </div>
            )}

            <button
              onClick={() => setPainelDestino(true)}
              className="flex w-full items-center gap-3 rounded-2xl bg-[#F5F5F7] px-4 py-4 text-left"
            >
              <Search size={20} className="text-[#6B6B6B]" />
              <span className={destino ? "font-semibold" : "text-[#6B6B6B]"}>{destino || "Para onde?"}</span>
            </button>

            {destinoCoords && !destinoPermitido && (
              <div className="flex items-start gap-2 rounded-2xl bg-[#FFF7E6] p-3 text-xs text-[#7A5B00]">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>Este destino está fora de {mun?.name ?? "seu município de exercício"}.</span>
              </div>
            )}

            {destinoCoords && destinoPermitido && distanciaKm != null && (
              <div className="rounded-2xl border border-[#E8E8E8] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{tarifa.label}</p>
                    <p className="text-xs text-[#6B6B6B]">
                      {distanciaKm} km · aprox. {tempoMin} min
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#3DB54A]">Serviço gratuito</p>
                </div>
              </div>
            )}

            <button
              disabled={!destinoCoords || !destinoPermitido || enviando}
              onClick={confirmar}
              className="w-full rounded-2xl bg-[#3DB54A] py-4 font-bold text-white disabled:opacity-40"
            >
              {enviando ? "Enviando…" : tarifa.confirmar}
            </button>

            <button
              onClick={abrirExcecao}
              className="w-full rounded-2xl border border-[#E8E8E8] py-3 text-sm font-semibold text-[#4A4A4A]"
            >
              Solicitar autorização para deslocamento fora do município
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
      <PassageiroTabBar />

      {/* Painel de destino */}
      {painelDestino &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[2000] overflow-y-auto bg-background">
            <OrigemDestinoPanel
              titulo="Para onde vamos?"
              pillLabel={agendado ? "Partir mais tarde" : "Agora"}
              scheduledAt={scheduledAt}
              onVoltar={() => setPainelDestino(false)}
              origem={origem}
              origemPlaceholder="Ponto de partida"
              onOrigemChange={setOrigem}
              destino={destino}
              destinoPlaceholder="Para onde?"
              autoFocusDestino
              onDestinoChange={(v) => {
                setDestino(v);
                setDestinoCoords(null);
              }}
              opcoes={[
                {
                  id: "salvos",
                  label: "Locais salvos",
                  Icon: IconesOpcao.Star,
                  onClick: () => setPainelDestino(false),
                },
                {
                  id: "mapa",
                  label: "Defina a localização no mapa",
                  Icon: IconesOpcao.MapPin,
                  onClick: () => setPainelDestino(false),
                },
                {
                  id: "municipios",
                  label: "Municípios autorizados",
                  Icon: IconesOpcao.Landmark,
                  onClick: () => {
                    setPainelDestino(false);
                    setModalExcecao(true);
                  },
                },
              ]}
            >
              {buscando && <p className="mt-2 text-sm text-muted-foreground">Buscando endereços…</p>}
              <div className="flex flex-col divide-y divide-border/50 pb-8">
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
                    <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
                    <span className="text-sm">{s.display_name}</span>
                  </button>
                ))}
              </div>
            </OrigemDestinoPanel>
          </div>,
          document.body,
        )}

      {/* Ciência do uso institucional — exigida antes da 1ª corrida do dia */}
      {modalCiencia && (
        <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6">
            <h2 className="text-lg font-bold">Uso da Mobilidade Urbana</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">{AVISO_MOBILIDADE}</p>
            <label className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={ciente}
                onChange={(e) => setCiente(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-[#3DB54A]"
              />
              <span className="text-sm">
                Estou ciente e confirmo que a chamada tem finalidade estritamente profissional durante
                meu horário de expediente
              </span>
            </label>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setModalCiencia(false)}
                className="flex-1 rounded-2xl border border-[#E8E8E8] py-3 font-semibold"
              >
                Voltar
              </button>
              <button
                disabled={!ciente || salvandoCiencia}
                onClick={aceitarCiencia}
                className="flex-1 rounded-2xl bg-[#3DB54A] py-3 font-bold text-white disabled:opacity-40"
              >
                {salvandoCiencia ? "Registrando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Autorização especial para deslocamento intermunicipal */}
      {modalExcecao && (
        <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6">
            <h2 className="text-lg font-bold">Deslocamento fora do município</h2>
            <p className="mt-2 text-sm text-[#6B6B6B]">
              O pedido é analisado pela administração e, se aprovado, vale para uma chamada na data informada.
            </p>

            <label className="mt-4 block text-sm font-semibold">Município de destino</label>
            <select
              value={exMunicipio}
              onChange={(e) => setExMunicipio(e.target.value)}
              className="mt-1 w-full rounded-2xl bg-[#F5F5F7] px-4 py-3 text-sm outline-none"
            >
              <option value="">Selecione…</option>
              {municipios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.uf}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-sm font-semibold">Data prevista</label>
            <input
              type="date"
              value={exData}
              onChange={(e) => setExData(e.target.value)}
              className="mt-1 w-full rounded-2xl bg-[#F5F5F7] px-4 py-3 text-sm outline-none"
            />

            <label className="mt-4 block text-sm font-semibold">Motivo do deslocamento</label>
            <textarea
              value={exMotivo}
              onChange={(e) => setExMotivo(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder="Descreva a finalidade profissional do deslocamento"
              className="mt-1 w-full rounded-2xl bg-[#F5F5F7] px-4 py-3 text-sm outline-none"
            />

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setModalExcecao(false)}
                className="flex-1 rounded-2xl border border-[#E8E8E8] py-3 font-semibold"
              >
                Voltar
              </button>
              <button
                disabled={!exMunicipio || exMotivo.trim().length < 5 || !exData || enviandoExcecao}
                onClick={enviarExcecao}
                className="flex-1 rounded-2xl bg-[#3DB54A] py-3 font-bold text-white disabled:opacity-40"
              >
                {enviandoExcecao ? "Enviando…" : "Enviar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>


  );
}
