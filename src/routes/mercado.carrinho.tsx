import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCarrinhoMercado, formatBRL } from "@/lib/mercado/carrinho";
import { supabase } from "@/integrations/supabase/client";
import { mapLoja } from "@/lib/mercado/db";
import type { Loja } from "@/lib/mercado/tipos";

export const Route = createFileRoute("/mercado/carrinho")({ component: Carrinho });

const BRAND = "var(--dz-brand)";
const BRAND_STRONG = "var(--dz-brand-strong)";
const BRAND_INK = "var(--dz-brand-ink)";
const BG = "var(--dz-bg)";
const CARD = "var(--dz-surface)";
const CARD_3 = "var(--dz-surface-3)";
const BORDER = "var(--dz-line)";
const TEXT = "var(--dz-ink)";
const MUTED = "var(--dz-muted)";

function Carrinho() {
  const { itens, subtotal, ajustar, remover, lojaId } = useCarrinhoMercado();
  const navigate = useNavigate();
  const [loja, setLoja] = useState<Loja | null>(null);

  useEffect(() => {
    if (!lojaId) { setLoja(null); return; }
    supabase.from("mercado_lojas").select("*").eq("id", lojaId).maybeSingle().then(({ data }) => {
      setLoja(data ? mapLoja(data) : null);
    });
  }, [lojaId]);

  const taxa = loja?.taxa ?? 0;
  const total = subtotal + taxa;

  if (itens.length === 0) {
    return (
      <div style={{ background: BG, color: TEXT, fontFamily: "var(--dz-font)", minHeight: "100dvh" }}>
        <Header />
        <div className="p-8 text-center">
          <p className="mb-4" style={{ color: MUTED }}>Seu carrinho está vazio.</p>
          <Link to="/mercado" className="inline-block px-5 py-3 rounded-full font-black text-sm" style={{ background: BRAND, color: BRAND_INK }}>
            Ver supermercados
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "var(--dz-font)", minHeight: "100dvh" }}>
      <Header />
      <main className="p-4 flex flex-col gap-4">
        {loja && (
          <p className="text-xs" style={{ color: MUTED }}>Pedido em <b style={{ color: TEXT }}>{loja.nome}</b></p>
        )}

        <section className="flex flex-col gap-2">
          {itens.map((i) => (
            <div key={i.uid} className="flex gap-3 rounded-xl p-3" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "var(--dz-shadow-1)" }}>
              <img src={i.produto.imagem} alt="" className="w-14 h-14 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>{i.produto.nome}</p>
                {i.adicionais.length > 0 && (
                  <p className="text-[11px] truncate" style={{ color: MUTED }}>+ {i.adicionais.map((a) => a.nome).join(", ")}</p>
                )}
                {i.obs && <p className="text-[11px] italic truncate" style={{ color: MUTED }}>"{i.obs}"</p>}
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => ajustar(i.uid, -1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: CARD_3 }}><Minus size={12} color={TEXT} /></button>
                  <span className="text-xs font-bold w-4 text-center" style={{ color: TEXT }}>{i.quantidade}</span>
                  <button onClick={() => ajustar(i.uid, 1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: CARD_3 }}><Plus size={12} color={TEXT} /></button>
                  <button onClick={() => remover(i.uid)} className="ml-auto" style={{ color: MUTED }}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: BRAND_STRONG }}>{formatBRL((i.produto.preco + i.adicionais.reduce((s, a) => s + a.preco, 0)) * i.quantidade)}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "var(--dz-shadow-1)" }}>
          <Row label="Subtotal" value={formatBRL(subtotal)} />
          <Row label="Taxa de entrega" value={formatBRL(taxa)} />
          <div className="h-px my-2" style={{ background: BORDER }} />
          <Row label="Total" value={formatBRL(total)} bold />
        </section>

        <button
          onClick={() => navigate({ to: "/mercado/checkout" })}
          className="rounded-full px-5 py-4 font-black text-sm"
          style={{ background: BRAND, color: BRAND_INK, boxShadow: "var(--dz-shadow-2)" }}
        >
          Continuar
        </button>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-3 p-4" style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>
      <Link to="/mercado" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: CARD_3 }}>
        <ArrowLeft size={18} color={TEXT} />
      </Link>
      <h1 className="text-lg font-black" style={{ color: TEXT }}>Carrinho</h1>
    </header>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-1" style={{ fontWeight: bold ? 900 : 500 }}>
      <span style={{ color: bold ? TEXT : MUTED }}>{label}</span>
      <span style={{ color: bold ? BRAND_STRONG : TEXT }}>{value}</span>
    </div>
  );
}
