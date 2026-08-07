import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { reverseGeocode, geocodeAddress } from "@/lib/geocoding";
import { EmojiIcon } from "@/components/emoji-icon";

export type LatLng = { lat: number; lng: number };
export type MapaConfirmResult = { lat: number; lng: number; endereco: string };

interface Props {
  cidade: string;
  estado: string;
  initial?: LatLng | null;
  onClose: () => void;
  onConfirm: (r: MapaConfirmResult) => void;
}

function CenterTracker({ onChange }: { onChange: (c: LatLng) => void }) {
  const map = useMapEvents({
    move() {
      const c = map.getCenter();
      onChange({ lat: c.lat, lng: c.lng });
    },
  });
  return null;
}

function FlyTo({ to }: { to: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.setView([to.lat, to.lng], 16, { animate: true });
  }, [to, map]);
  return null;
}

export default function MapaModal({ cidade, estado, initial, onClose, onConfirm }: Props) {
  const [center, setCenter] = useState<LatLng | null>(initial ?? null);
  const [current, setCurrent] = useState<LatLng | null>(initial ?? null);
  const [endereco, setEndereco] = useState<string>("");
  const [flyTo, setFlyTo] = useState<LatLng | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Centro inicial: initial > geocode da cidade > fallback Brasil
  useEffect(() => {
    if (center) return;
    let cancel = false;
    (async () => {
      const hit = await geocodeAddress(`${cidade}, ${estado}, Brasil`);
      if (cancel) return;
      if (hit) setCenter({ lat: Number(hit.lat), lng: Number(hit.lon) });
      else setCenter({ lat: -14.235, lng: -51.9253 });
    })();
    return () => { cancel = true; };
  }, [cidade, estado, center]);

  // Reverse geocode com debounce 1s
  useEffect(() => {
    if (!current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const r = await reverseGeocode(current.lat, current.lng);
      setEndereco(r?.display_name ?? "");
    }, 1000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [current]);

  function usarMinhaLocalizacao() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setFlyTo(p);
        setCurrent(p);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function confirmar() {
    if (!current) return;
    setConfirmando(true);
    onConfirm({
      lat: current.lat,
      lng: current.lng,
      endereco: endereco || "Localização marcada manualmente",
    });
  }

  // Pino customizado (roxo + ponta verde neon) via divIcon
  const pinHtml = `
    <div style="position:relative;width:36px;height:48px;transform:translate(-50%,-100%)">
      <svg viewBox="0 0 36 48" width="36" height="48" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0C8 0 0 8 0 18c0 12 18 30 18 30s18-18 18-30C36 8 28 0 18 0z" fill="#7B00D4" stroke="#00FF00" stroke-width="2"/>
        <circle cx="18" cy="18" r="6" fill="#00FF00"/>
      </svg>
    </div>`;

  // Para o pino fixo no centro, usamos um overlay HTML (não Marker) — assim ele não se move
  if (!center) {
    return (
      <div className="fixed inset-0 z-[999] bg-black flex items-center justify-center text-white">
        <div className="spinner-mz" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[999] bg-black flex flex-col">
      {/* Topbar */}
      <div className="absolute top-0 left-0 right-0 z-[1001] px-4 py-3 bg-gradient-to-b from-black/80 to-transparent text-white pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <button onClick={onClose} className="text-sm bg-black/60 px-3 py-1.5 rounded-md"><EmojiIcon e="✕" /> Fechar</button>
          <div className="text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-md">
            Arraste o mapa até o local exato
          </div>
          <div className="w-12" />
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={16}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CenterTracker onChange={setCurrent} />
          <FlyTo to={flyTo} />
        </MapContainer>

        {/* Pino fixo no centro */}
        <div
          className="absolute top-1/2 left-1/2 z-[1000] pointer-events-none"
          dangerouslySetInnerHTML={{ __html: pinHtml }}
        />

        {/* Botão minha localização */}
        <button
          onClick={usarMinhaLocalizacao}
          className="absolute bottom-32 right-4 z-[1001] size-12 rounded-full bg-white shadow-lg flex items-center justify-center text-xl"
          title="Usar minha localização"
        >
          <EmojiIcon e="🎯" />
        </button>
      </div>

      {/* Footer */}
      <div className="z-[1001] bg-background border-t border-white/10 p-4 flex flex-col gap-2">
        <div className="text-xs text-white/70 line-clamp-2 min-h-[2.5rem]">
          <EmojiIcon e="📍" /> {endereco || "Localizando endereço aproximado…"}
        </div>
        <button
          onClick={confirmar}
          disabled={!current || confirmando}
          className="btn-cta w-full"
        >
          {confirmando ? "Confirmando…" : "CONFIRMAR LOCALIZAÇÃO"}
        </button>
      </div>
    </div>
  );
}

// Workaround default icon (mesmo não usando Marker, evita warning)
if (typeof window !== "undefined") {
  // @ts-expect-error _getIconUrl é interno
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}
