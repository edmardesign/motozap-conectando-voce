import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { adminAuditoriaRota, type LinhaAuditoria } from "@/lib/mobilidade-auditoria.functions";

const pin = (cor: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${cor};border:3px solid #fff"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

function dt(v: string | null) {
  return v ? new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
}

export function AuditoriaRotaModal({ linha, onClose }: { linha: LinhaAuditoria; onClose: () => void }) {
  const buscarRota = useServerFn(adminAuditoriaRota);
  const [rota, setRota] = useState<Array<{ lat: number; lng: number }>>([]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await buscarRota({ data: { corrida_id: linha.id } });
        if (!cancel) setRota(r.map((p) => ({ lat: p.lat, lng: p.lng })));
      } catch {
        /* sem rota registrada */
      }
    })();
    return () => {
      cancel = true;
    };
  }, [linha.id, buscarRota]);

  const origem = linha.origem_lat != null && linha.origem_lng != null ? { lat: linha.origem_lat, lng: linha.origem_lng } : null;
  const destino =
    linha.destino_lat != null && linha.destino_lng != null ? { lat: linha.destino_lat, lng: linha.destino_lng } : null;
  const centro = origem ?? destino ?? { lat: -14.235, lng: -51.9253 };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white text-[#111111]">
        <div className="flex items-start justify-between gap-4 border-b border-[#EEE] p-5">
          <div>
            <h2 className="text-lg font-bold">{linha.servidor ?? "Servidor"}</h2>
            <p className="text-xs text-[#6B6B6B]">
              {[linha.cargo, linha.lotacao].filter(Boolean).join(" · ") || "Cargo/lotação não informados"}
            </p>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="rounded-full bg-[#F5F5F7] p-2">
            <X size={16} />
          </button>
        </div>

        <div className="h-64 w-full">
          <MapContainer center={[centro.lat, centro.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {origem && <Marker position={[origem.lat, origem.lng]} icon={pin("#2F80ED")} />}
            {destino && <Marker position={[destino.lat, destino.lng]} icon={pin("#3DB54A")} />}
            {origem && destino && (
              <Polyline
                positions={[
                  [origem.lat, origem.lng],
                  [destino.lat, destino.lng],
                ]}
                pathOptions={{ color: "#9AA5B1", weight: 4, dashArray: "6 8" }}
              />
            )}
            {rota.length > 1 && (
              <Polyline positions={rota.map((p) => [p.lat, p.lng]) as [number, number][]} pathOptions={{ color: "#3DB54A", weight: 5 }} />
            )}
          </MapContainer>
        </div>

        <div className="grid gap-2 overflow-y-auto p-5 text-sm">
          <p className="text-xs text-[#6B6B6B]">
            Linha tracejada cinza: rota planejada. Linha verde: rota percorrida ({rota.length} pontos de GPS).
          </p>
          <Info rotulo="Solicitada em" valor={dt(linha.criada_em)} />
          <Info rotulo="Aceita em" valor={dt(linha.aceita_em)} />
          <Info rotulo="Iniciada em" valor={dt(linha.iniciada_em)} />
          <Info rotulo="Finalizada em" valor={dt(linha.finalizada_em)} />
          <Info rotulo="Origem" valor={linha.origem ?? "—"} />
          <Info rotulo="Destino" valor={linha.destino ?? "—"} />
          <Info rotulo="Modalidade" valor={linha.modalidade === "moto_taxi" ? "Moto táxi" : "Automóvel"} />
          <Info rotulo="Motorista" valor={linha.motorista ?? "—"} />
          <Info rotulo="Distância" valor={linha.distancia_km != null ? `${linha.distancia_km} km` : "—"} />
          <Info rotulo="Duração" valor={linha.duracao_min != null ? `${linha.duracao_min} min` : "—"} />
          <Info rotulo="Situação" valor={linha.status} />
        </div>
      </div>
    </div>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#F3F3F3] pb-1">
      <span className="text-[#6B6B6B]">{rotulo}</span>
      <span className="text-right font-medium">{valor}</span>
    </div>
  );
}
