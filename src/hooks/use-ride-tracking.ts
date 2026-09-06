import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Captura a rota efetivamente percorrida durante uma corrida de Mobilidade
 * Urbana: um ponto de GPS a cada ~10 segundos, gravado em ride_route_points.
 * Não se aplica ao fluxo de Logística de Envios.
 */
export function useRideTracking(params: {
  corridaId: string | null;
  motoristaId: string | null;
  ativo: boolean;
  intervaloMs?: number;
}) {
  const { corridaId, motoristaId, ativo, intervaloMs = 10000 } = params;

  useEffect(() => {
    if (!ativo || !corridaId || !motoristaId) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let parado = false;

    const capturar = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (parado) return;
          await supabase.from("ride_route_points" as any).insert({
            corrida_id: corridaId,
            motorista_id: motoristaId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          } as any);
        },
        () => {
          /* sem GPS neste ciclo: tenta novamente no próximo intervalo */
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
      );
    };

    capturar();
    const t = setInterval(capturar, intervaloMs);
    return () => {
      parado = true;
      clearInterval(t);
    };
  }, [corridaId, motoristaId, ativo, intervaloMs]);
}
