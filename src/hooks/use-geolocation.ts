import { useCallback, useState } from "react";

export interface Coords {
  lat: number;
  lng: number;
}

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    return new Promise<Coords | null>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setError("Geolocalização não está disponível neste dispositivo.");
        resolve(null);
        return;
      }
      setLoading(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          setLoading(false);
          resolve(c);
        },
        (err) => {
          setLoading(false);
          if (err.code === err.PERMISSION_DENIED) {
            setError("Permissão de localização negada. Digite o endereço manualmente.");
          } else {
            setError("Não foi possível obter a sua localização.");
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    });
  }, []);

  return { coords, loading, error, request };
}
