import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bike, CalendarClock, Car, Package, X } from "lucide-react";

type AgendamentoTipo = "automovel" | "moto" | "logistica";

export interface AgendamentoSheetProps {
  open?: boolean;
  onClose?: () => void;
  embedded?: boolean;
}

const opcoes = [
  { id: "automovel" as const, label: "Solicitar Automóvel", Icon: Car },
  { id: "moto" as const, label: "Solicitar Moto Táxi", Icon: Bike },
  { id: "logistica" as const, label: "Solicitar Envio (Logística)", Icon: Package },
];

export function AgendamentoSheet({ open = true, onClose, embedded = false }: AgendamentoSheetProps) {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<AgendamentoTipo | null>(null);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");

  if (!open) return null;

  function continuar() {
    if (!tipo || !data || !hora) return;
    if (tipo === "automovel") {
      navigate({ to: "/passageiro/mobilidade/automovel", search: { agendar: "1", data, hora } });
      return;
    }
    if (tipo === "moto") {
      navigate({ to: "/passageiro/mobilidade/moto", search: { agendar: "1", data, hora } });
      return;
    }
    navigate({ to: "/hub", search: { agendar: "1", data, hora } });
  }

  const content = (
    <div className={`w-full max-w-lg bg-card p-5 ${embedded ? "rounded-3xl shadow-sm" : "rounded-t-3xl shadow-xl"}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-primary">MAIS TARDE</p>
          <h2 className="text-xl font-bold">Agendar solicitação</h2>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-fill-tertiary"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-3">
        {opcoes.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTipo(id)}
            className={`flex min-h-16 items-center gap-4 rounded-2xl border p-4 text-left transition ${
              tipo === id ? "border-primary bg-primary/10" : "border-border bg-background"
            }`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fill-secondary">
              <Icon size={23} strokeWidth={1.7} />
            </span>
            <span className="font-semibold">{label}</span>
          </button>
        ))}
      </div>

      {tipo && (
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5">
          <label className="text-xs font-semibold text-muted-foreground">
            Data
            <input
              type="date"
              value={data}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setData(event.target.value)}
              className="mt-1 h-12 w-full rounded-xl bg-fill-tertiary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Horário
            <input
              type="time"
              value={hora}
              onChange={(event) => setHora(event.target.value)}
              className="mt-1 h-12 w-full rounded-xl bg-fill-tertiary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <button
            type="button"
            disabled={!data || !hora}
            onClick={continuar}
            className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-40"
          >
            <CalendarClock size={19} />
            Continuar
          </button>
        </div>
      )}
    </div>
  );

  if (embedded) return content;
  return <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-foreground/35">{content}</div>;
}