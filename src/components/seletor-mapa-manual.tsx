import { lazy, Suspense, useState } from "react";
import type { MapaConfirmResult, LatLng } from "./mapa-modal";
import { EmojiIcon } from "@/components/emoji-icon";

const MapaModal = lazy(() => import("./mapa-modal"));

interface Props {
  cidade: string;
  estado: string;
  /** Coordenadas atuais (se já marcadas). */
  value?: LatLng | null;
  onConfirm: (r: MapaConfirmResult) => void;
  /** Mensagem do card de fallback. */
  message?: string;
  /** Aviso extra exibido abaixo do card (ex.: destino sem bairro estruturado). */
  hint?: string;
  /** Label custom do botão. */
  buttonLabel?: string;
}

export function SeletorMapaManual({
  cidade,
  estado,
  value,
  onConfirm,
  message = "Não localizamos esse endereço automaticamente",
  hint,
  buttonLabel = "MARCAR NO MAPA",
}: Props) {
  const [open, setOpen] = useState(false);
  const disabled = !cidade || !estado;

  return (
    <div className="flex flex-col gap-2">
      <div className="card-mz p-3 flex flex-col gap-2 border border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-start gap-2 text-sm">
          <span className="text-lg leading-none"><EmojiIcon e="📍" /></span>
          <span className="text-foreground/85">{message}</span>
        </div>
        {value && (
          <div className="text-xs text-emerald-400">
            <EmojiIcon e="✓" /> Localização marcada ({value.lat.toFixed(5)}, {value.lng.toFixed(5)})
          </div>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="btn-cta w-full !py-2 text-sm"
        >
          {value ? "AJUSTAR NO MAPA" : buttonLabel}
        </button>
        {disabled && (
          <div className="text-[11px] text-muted-foreground">
            Selecione estado e cidade primeiro.
          </div>
        )}
        {hint && (
          <div className="text-[11px] text-muted-foreground italic">{hint}</div>
        )}
      </div>

      {open && (
        <Suspense fallback={null}>
          <MapaModal
            cidade={cidade}
            estado={estado}
            initial={value ?? null}
            onClose={() => setOpen(false)}
            onConfirm={(r) => {
              onConfirm(r);
              setOpen(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

export type { MapaConfirmResult, LatLng } from "./mapa-modal";
