import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/pedir/carrinho";

export const Route = createFileRoute("/pedir/confirmado/$id")({ component: Confirmado });

const BRAND = "var(--dz-brand)";
const BRAND_STRONG = "var(--dz-brand-strong)";
const BRAND_INK = "var(--dz-brand-ink)";
const BG = "var(--dz-bg)";
const TEXT = "var(--dz-ink)";
const MUTED = "var(--dz-muted)";

interface Resumo {
  numero: number;
  loja: string;
  total: number;
  endereco: string;
}

function Confirmado() {
  const { id } = useParams({ from: "/pedir/confirmado/$id" });
  const [r, setR] = useState<Resumo | null>(null);

  useEffect(() => {
    supabase
      .from("food_pedidos")
      .select("numero_pedido, total, endereco_entrega, food_lojas(nome)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const loja = (data as { food_lojas: { nome: string } | null }).food_lojas;
        setR({
          numero: data.numero_pedido,
          total: Number(data.total),
          endereco: data.endereco_entrega,
          loja: loja?.nome ?? "",
        });
      });
  }, [id]);

  return (
    <div className="min-h-[80dvh] flex flex-col items-center justify-center p-6 text-center" style={{ background: BG, color: TEXT, fontFamily: "var(--dz-font)" }}>
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: BRAND, boxShadow: "var(--dz-shadow-3)" }}>
        <CheckCircle2 size={54} color={BRAND_INK} />
      </div>
      <h1 className="text-2xl font-black" style={{ color: TEXT }}>Pedido confirmado!</h1>
      <p className="text-sm mt-2" style={{ color: MUTED }}>Aguardando confirmação do estabelecimento.</p>
      {r && (
        <div className="mt-4 text-sm" style={{ color: TEXT }}>
          <p>Pedido #{r.numero} — <b>{r.loja}</b></p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>Entrega em: {r.endereco}</p>
          <p className="mt-1 font-black" style={{ color: BRAND_STRONG }}>Total: {formatBRL(r.total)}</p>
        </div>
      )}
      <p className="text-[11px] mt-3" style={{ color: MUTED }}>Nº interno: {id.slice(0, 8)}</p>
      <div className="w-full max-w-sm mt-8 flex flex-col gap-3">
        <Link to="/pedir/acompanhar/$id" params={{ id }} className="rounded-full px-5 py-4 font-black text-sm" style={{ background: BRAND, color: BRAND_INK, boxShadow: "var(--dz-shadow-2)" }}>
          Acompanhar entrega
        </Link>
        <Link to="/pedir" className="text-center text-sm underline" style={{ color: MUTED }}>Voltar ao início</Link>
      </div>
    </div>
  );
}
