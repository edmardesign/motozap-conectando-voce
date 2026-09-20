import type { ReactNode } from "react";
import { ChevronLeft, ChevronDown, Clock, Star, MapPin, Landmark } from "lucide-react";

export interface OpcaoOrigemDestino {
  id: string;
  label: string;
  Icon: typeof Star;
  onClick: () => void;
}

export interface OrigemDestinoPanelProps {
  /** Título centralizado do cabeçalho. */
  titulo: string;
  /** Rótulo do pill de horário (ex.: "Agora", "Partir"). */
  pillLabel: string;
  onVoltar: () => void;
  onPill?: () => void;
  scheduledAt?: string;
  origem: string;
  origemPlaceholder?: string;
  onOrigemChange?: (v: string) => void;
  origemSomenteLeitura?: boolean;
  destino: string;
  destinoPlaceholder: string;
  onDestinoChange: (v: string) => void;
  autoFocusDestino?: boolean;
  opcoes: OpcaoOrigemDestino[];
  /** Conteúdo abaixo da lista (sugestões, avisos). */
  children?: ReactNode;
}

/** Ícones prontos para as opções padrão das duas jornadas. */
export const IconesOpcao = { Star, MapPin, Landmark };

/**
 * Estrutura única de origem/destino reutilizada na Mobilidade Urbana e na Logística de Envios.
 * Componente puramente visual: nenhuma regra de negócio vive aqui.
 */
export function OrigemDestinoPanel({
  titulo,
  pillLabel,
  onVoltar,
  onPill,
  scheduledAt,
  origem,
  origemPlaceholder = "Ponto de partida",
  onOrigemChange,
  origemSomenteLeitura = false,
  destino,
  destinoPlaceholder,
  onDestinoChange,
  autoFocusDestino = false,
  opcoes,
  children,
}: OrigemDestinoPanelProps) {
  return (
    <div className="flex min-h-full flex-col bg-background font-sans text-foreground">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3">
        <button
          type="button"
          aria-label="Voltar"
          onClick={onVoltar}
          className="flex h-10 w-10 items-center justify-center rounded-full"
        >
          <ChevronLeft size={24} strokeWidth={1.8} />
        </button>
        <h1 className="truncate text-center text-[17px] font-semibold">{titulo}</h1>
        <span className="h-10 w-10" />
      </header>

      <div className="mx-auto w-full max-w-lg px-4">
        <button
          type="button"
          onClick={onPill}
          className="flex items-center gap-1.5 rounded-full bg-fill-tertiary px-3.5 py-2 text-[14px] font-medium"
        >
          <Clock size={16} strokeWidth={1.8} />
          {pillLabel}
          <ChevronDown size={16} strokeWidth={1.8} />
        </button>
        {scheduledAt && (
          <p className="mt-2 text-xs font-medium text-primary">Agendado para {scheduledAt}</p>
        )}

        {/* Card único com origem e destino conectados */}
        <div className="mt-4 rounded-2xl bg-fill-tertiary p-4">
          <div className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-3">
            <div className="flex items-center justify-center pt-4">
              <span className="h-2.5 w-2.5 rounded-full bg-foreground" />
            </div>
            <input
              value={origem}
              readOnly={origemSomenteLeitura}
              onChange={(e) => onOrigemChange?.(e.target.value)}
              placeholder={origemPlaceholder}
              className="h-11 w-full bg-transparent text-[16px] outline-none placeholder:text-muted-foreground"
            />

            <div className="flex justify-center">
              <span className="h-full w-px bg-[color:var(--label-secondary)]" />
            </div>
            <span className="h-2 border-t border-border/60" />

            <div className="flex items-center justify-center pt-4">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-foreground" />
            </div>
            <input
              value={destino}
              autoFocus={autoFocusDestino}
              onChange={(e) => onDestinoChange(e.target.value)}
              placeholder={destinoPlaceholder}
              className="h-11 w-full bg-transparent text-[16px] outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <ul className="mt-2">
          {opcoes.map(({ id, label, Icon, onClick }) => (
            <li key={id}>
              <button
                type="button"
                onClick={onClick}
                className="flex h-14 w-full items-center gap-4 text-left"
              >
                <Icon size={24} strokeWidth={1.6} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-[17px]">{label}</span>
              </button>
            </li>
          ))}
        </ul>

        {children}
      </div>
    </div>
  );
}
