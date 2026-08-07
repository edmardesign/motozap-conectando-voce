import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, ChefHat, Package, Bike, Home as HomeIcon, Clock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/pedir/acompanhar/$id")({ component: Acompanhar });

const BRAND = "var(--dz-brand)";
const BRAND_STRONG = "var(--dz-brand-strong)";
const BRAND_INK = "var(--dz-brand-ink)";
const BG = "var(--dz-bg)";
const CARD = "var(--dz-surface)";
const CARD_3 = "var(--dz-surface-3)";
const BORDER = "var(--dz-line)";
const TEXT = "var(--dz-ink)";
const MUTED = "var(--dz-muted)";
const DANGER = "var(--dz-danger)";

type Status = Database["public"]["Enums"]["food_status_pedido"];

const ETAPAS: { id: Status; label: string; Icon: typeof Clock }[] = [
  { id: "novo", label: "Aguardando confirmação", Icon: Clock },
  { id: "confirmado", label: "Pedido aceito", Icon: Check },
  { id: "em_preparo", label: "Em preparo", Icon: ChefHat },
  { id: "pronto", label: "Pedido pronto", Icon: Package },
  { id: "em_entrega", label: "Entregador a caminho", Icon: Bike },
  { id: "entregue", label: "Entregue", Icon: HomeIcon },
];

function idxDeStatus(s: Status): number {
  if (s === "cancelado") return -1;
  const i = ETAPAS.findIndex((e) => e.id === s);
  return i < 0 ? 0 : i;
}

function Acompanhar() {
  const { id } = useParams({ from: "/pedir/acompanhar/$id" });
  const [status, setStatus] = useState<Status>("novo");
  const [numero, setNumero] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("food_pedidos")
      .select("status, numero_pedido")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setStatus(data.status);
        setNumero(data.numero_pedido);
      });

    const ch = supabase
      .channel(`pedido-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "food_pedidos", filter: `id=eq.${id}` },
        (payload) => {
          const novo = payload.new as { status: Status };
          setStatus(novo.status);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const step = idxDeStatus(status);
  const cancelado = status === "cancelado";

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "var(--dz-font)", minHeight: "100dvh" }}>
      <header className="flex items-center gap-3 p-4" style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>
        <Link to="/pedir/pedidos" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: CARD_3 }}>
          <ArrowLeft size={18} color={TEXT} />
        </Link>
        <div>
          <h1 className="text-base font-black" style={{ color: TEXT }}>Acompanhar pedido</h1>
          <p className="text-[11px]" style={{ color: MUTED }}>{numero != null ? `Nº ${numero}` : id.slice(0, 8)}</p>
        </div>
      </header>

      <div className="p-4">
        <div className="rounded-2xl p-6 text-center" style={{ background: CARD, border: `1px solid ${cancelado ? DANGER : BRAND}`, boxShadow: "var(--dz-shadow-1)" }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: MUTED }}>Status atual</p>
          <p className="text-xl font-black mt-2" style={{ color: cancelado ? DANGER : BRAND_STRONG }}>
            {cancelado ? "Pedido cancelado" : ETAPAS[step].label}
          </p>
          {!cancelado && <p className="text-[11px] mt-2" style={{ color: MUTED }}>Previsão: 20-30 min</p>}
        </div>
      </div>

      <div className="px-4 pb-6">
        <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "var(--dz-shadow-1)" }}>
          {cancelado ? (
            <div className="flex items-center gap-3 py-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: DANGER, color: "#fff" }}>
                <X size={16} />
              </div>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>Este pedido foi cancelado.</p>
            </div>
          ) : (
            ETAPAS.map((e, i) => {
              const done = i < step;
              const active = i === step;
              const on = done || active;
              const Icon = e.Icon;
              return (
                <div key={e.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: on ? BRAND : CARD_3, color: on ? BRAND_INK : MUTED }}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: on ? TEXT : MUTED }}>{e.label}</p>
                    {active && <p className="text-[11px]" style={{ color: BRAND_STRONG }}>Em andamento</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
