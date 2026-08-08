import { useState } from "react";
import { toast } from "sonner";
import { geocodeFull } from "@/lib/geocoding";
import { SeletorMapaManual } from "@/components/seletor-mapa-manual";
import { EmojiIcon } from "@/components/emoji-icon";


export type AddressValue = {
  rua: string;
  numero: string;
  bairro: string;
  complemento: string;
  latitude: number | null;
  longitude: number | null;
};

export const emptyAddress: AddressValue = {
  rua: "",
  numero: "",
  bairro: "",
  complemento: "",
  latitude: null,
  longitude: null,
};

interface Props {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  cidade: string;
  estado: string;
}

export function AddressFields({ value, onChange, cidade, estado }: Props) {
  const [geocoding, setGeocoding] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);

  function update(patch: Partial<AddressValue>) {
    onChange({ ...value, ...patch });
  }

  async function tryGeocode() {
    if (!value.rua || !value.numero || !value.bairro || !cidade || !estado) return;
    setGeocoding(true);
    setWarn(null);
    try {
      const hit = await geocodeFull({
        rua: value.rua,
        numero: value.numero,
        bairro: value.bairro,
        cidade,
        estado,
      });
      if (hit) {
        update({ latitude: Number(hit.lat), longitude: Number(hit.lon) });
        setWarn(null);
        toast.success("Endereço localizado no mapa");
      } else {
        update({ latitude: null, longitude: null });
        setWarn(
          "Não conseguimos localizar seu endereço no mapa. Isso não impede seu cadastro, mas recomendamos confirmar manualmente depois.",
        );
      }
    } finally {
      setGeocoding(false);
    }
  }

  const canGeocode =
    cidade && estado && value.rua.trim() && value.numero.trim() && value.bairro.trim();

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Rua / Avenida</span>
        <input
          className="input-mz"
          value={value.rua}
          onChange={(e) => update({ rua: e.target.value })}
          placeholder="Av. Brasil"
          maxLength={120}
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1.5 col-span-1">
          <span className="text-sm font-medium">Número</span>
          <input
            className="input-mz"
            value={value.numero}
            onChange={(e) => update({ numero: e.target.value })}
            placeholder="123"
            maxLength={10}
          />
        </label>
        <label className="flex flex-col gap-1.5 col-span-2">
          <span className="text-sm font-medium">Bairro</span>
          <input
            className="input-mz"
            value={value.bairro}
            onChange={(e) => update({ bairro: e.target.value })}
            onBlur={tryGeocode}
            placeholder="Centro"
            maxLength={80}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Complemento (opcional)</span>
        <input
          className="input-mz"
          value={value.complemento}
          onChange={(e) => update({ complemento: e.target.value })}
          placeholder="Apto, ponto de referência…"
          maxLength={120}
        />
      </label>

      {geocoding && (
        <div className="text-xs text-muted-foreground"><EmojiIcon e="📍" /> Localizando endereço…</div>
      )}

      {value.latitude != null && value.longitude != null && !geocoding && (
        <div className="text-xs text-emerald-400">
          <EmojiIcon e="✓" /> Localizado: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </div>
      )}

      {warn && (
        <div className="flex flex-col gap-2">
          <div className="text-xs p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-200">
            <EmojiIcon e="⚠️" /> {warn}
          </div>
          <SeletorMapaManual
            cidade={cidade}
            estado={estado}
            value={
              value.latitude != null && value.longitude != null
                ? { lat: value.latitude, lng: value.longitude }
                : null
            }
            onConfirm={(r) => {
              update({ latitude: r.lat, longitude: r.lng });
              setWarn(null);
              toast.success("Localização marcada no mapa");
            }}
          />
        </div>
      )}
    </div>
  );
}

