import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MapPin, CreditCard, Banknote, QrCode, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useCarrinhoMercado, formatBRL } from "@/lib/mercado/carrinho";
import { supabase } from "@/integrations/supabase/client";
import { mapLoja } from "@/lib/mercado/db";
import type { Loja } from "@/lib/mercado/tipos";
import { toast } from "sonner";

export const Route = createFileRoute("/mercado/checkout")({ component: Checkout });

const BRAND = "var(--dz-brand)";
const BRAND_STRONG = "var(--dz-brand-strong)";
const BRAND_INK = "var(--dz-brand-ink)";
const BRAND_SOFT = "var(--dz-brand-soft)";
const BG = "var(--dz-bg)";
const CARD = "var(--dz-surface)";
const CARD_2 = "var(--dz-surface-2)";
const CARD_3 = "var(--dz-surface-3)";
const BORDER = "var(--dz-line)";
const TEXT = "var(--dz-ink)";
const MUTED = "var(--dz-muted)";

type Passo = "endereco" | "pagamento" | "revisao";
type FormaPag = "pix" | "cartao_credito" | "dinheiro";

function Checkout() {
  const [passo, setPasso] = useState<Passo>("endereco");
  const [endereco, setEndereco] = useState("Rua das Palmeiras, 123 — Centro");
  const [complemento, setComplemento] = useState("Apto 202");
  const [pagamento, setPagamento] = useState<FormaPag>("pix");
  const [loja, setLoja] = useState<Loja | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { itens, subtotal, lojaId, limpar } = useCarrinhoMercado();
  const taxa = loja?.taxa ?? 0;
  const total = subtotal + taxa;
  const navigate = useNavigate();

  useEffect(() => {
    if (!lojaId) { setLoja(null); return; }
    supabase.from("mercado_lojas").select("*").eq("id", lojaId).maybeSingle().then(({ data }) => {
      setLoja(data ? mapLoja(data) : null);
    });
  }, [lojaId]);

  async function finalizar() {
    if (enviando) return;
    if (!lojaId || itens.length === 0) {
      toast.error("Seu carrinho está vazio.");
      return;
    }
    setEnviando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        toast.error("Faça login para finalizar o pedido.");
        navigate({ to: "/passageiro" });
        return;
      }
      const { data: pedido, error: e1 } = await supabase
        .from("mercado_pedidos")
        .insert({
          loja_id: lojaId,
          cliente_user_id: uid,
          cidade_id: loja?.cidadeId ?? null,
          status: "novo",
          endereco_entrega: endereco,
          complemento: complemento || null,
          subtotal,
          taxa_entrega: taxa,
          total,
          forma_pagamento: pagamento,
        })
        .select("id")
        .single();
      if (e1 || !pedido) throw e1 ?? new Error("pedido");

      const itensPayload = itens.map((i) => {
        const precoAdic = i.adicionais.reduce((s, a) => s + a.preco, 0);
        const unit = i.produto.preco + precoAdic;
        return {
          pedido_id: pedido.id,
          produto_id: i.produto.id,
          nome_snapshot: i.produto.nome,
          preco_unitario: unit,
          quantidade: i.quantidade,
          adicionais: i.adicionais.map((a) => ({ id: a.id, nome: a.nome, preco: a.preco })),
          observacao: i.obs ?? null,
          subtotal: unit * i.quantidade,
        };
      });
      const { error: e2 } = await supabase.from("mercado_pedido_itens").insert(itensPayload);
      if (e2) throw e2;

      limpar();
      navigate({ to: "/mercado/confirmado/$id", params: { id: pedido.id } });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível finalizar o pedido, tente novamente.");
    } finally {
      setEnviando(false);
    }
  }


  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "var(--dz-font)", minHeight: "100dvh" }}>
      <header className="flex items-center gap-3 p-4" style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>
        <Link to="/mercado/carrinho" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: CARD_3 }}>
          <ArrowLeft size={18} color={TEXT} />
        </Link>
        <h1 className="text-lg font-black" style={{ color: TEXT }}>Finalizar pedido</h1>
      </header>

      <div className="px-4 pt-4 flex items-center gap-2">
        <Step n={1} label="Endereço" active={passo === "endereco"} done={passo !== "endereco"} />
        <Step n={2} label="Pagamento" active={passo === "pagamento"} done={passo === "revisao"} />
        <Step n={3} label="Revisão" active={passo === "revisao"} />
      </div>

      <main className="p-4 flex flex-col gap-4">
        {passo === "endereco" && (
          <section className="flex flex-col gap-3">
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: CARD, border: `1px solid ${BRAND}` }}>
              <MapPin size={20} color={BRAND_STRONG} />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: TEXT }}>Endereço de entrega</p>
                <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className="w-full mt-2 rounded-lg px-3 py-2 text-sm outline-none" style={{ background: CARD_2, border: `1px solid ${BORDER}`, color: TEXT }} />
                <input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Complemento" className="w-full mt-2 rounded-lg px-3 py-2 text-sm outline-none" style={{ background: CARD_2, border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
            </div>
            <button onClick={() => setPasso("pagamento")} className="rounded-full px-5 py-4 font-black text-sm" style={{ background: BRAND, color: BRAND_INK }}>Continuar</button>
          </section>
        )}

        {passo === "pagamento" && (
          <section className="flex flex-col gap-3">
            <PagOpt selected={pagamento === "pix"} onClick={() => setPagamento("pix")} icon={<QrCode size={18} color={BRAND_STRONG} />} label="Pix" desc="Aprovação imediata" />
            <PagOpt selected={pagamento === "cartao_credito"} onClick={() => setPagamento("cartao_credito")} icon={<CreditCard size={18} color={BRAND_STRONG} />} label="Cartão na entrega" desc="Crédito ou débito" />
            <PagOpt selected={pagamento === "dinheiro"} onClick={() => setPagamento("dinheiro")} icon={<Banknote size={18} color={BRAND_STRONG} />} label="Dinheiro" desc="Pagamento no local" />
            <button onClick={() => setPasso("revisao")} className="rounded-full px-5 py-4 font-black text-sm mt-2" style={{ background: BRAND, color: BRAND_INK }}>Continuar</button>
          </section>
        )}

        {passo === "revisao" && (
          <section className="flex flex-col gap-3">
            <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: MUTED }}>Loja</p>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>{loja?.nome}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: MUTED }}>Entregar em</p>
              <p className="text-sm" style={{ color: TEXT }}>{endereco}</p>
              <p className="text-[11px]" style={{ color: MUTED }}>{complemento}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: MUTED }}>Itens</p>
              {itens.map((i) => (
                <div key={i.uid} className="flex justify-between text-sm py-1" style={{ color: TEXT }}>
                  <span className="truncate mr-2">{i.quantidade}x {i.produto.nome}</span>
                  <span>{formatBRL((i.produto.preco + i.adicionais.reduce((s, a) => s + a.preco, 0)) * i.quantidade)}</span>
                </div>
              ))}
              <div className="h-px my-2" style={{ background: BORDER }} />
              <div className="flex justify-between text-sm py-1"><span style={{ color: MUTED }}>Subtotal</span><span style={{ color: TEXT }}>{formatBRL(subtotal)}</span></div>
              <div className="flex justify-between text-sm py-1"><span style={{ color: MUTED }}>Entrega</span><span style={{ color: TEXT }}>{formatBRL(taxa)}</span></div>
              <div className="flex justify-between text-base font-black py-1 mt-1"><span style={{ color: TEXT }}>Total</span><span style={{ color: BRAND_STRONG }}>{formatBRL(total)}</span></div>
              <p className="text-[11px] mt-2" style={{ color: MUTED }}>Pagamento: {pagamento === "pix" ? "Pix" : pagamento === "cartao_credito" ? "Cartão na entrega" : "Dinheiro"}</p>
            </div>
            <button onClick={finalizar} className="rounded-full px-5 py-4 font-black text-sm" style={{ background: BRAND, color: BRAND_INK, boxShadow: "var(--dz-shadow-2)" }}>
              Confirmar pedido
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function Step({ n, label, active, done }: { n: number; label: string; active?: boolean; done?: boolean }) {
  const on = done || active;
  return (
    <div className="flex items-center gap-1.5 flex-1">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: on ? BRAND : CARD_3, color: on ? BRAND_INK : MUTED }}>
        {done ? <Check size={12} /> : n}
      </span>
      <span className="text-[11px] font-semibold" style={{ color: on ? TEXT : MUTED }}>{label}</span>
    </div>
  );
}

function PagOpt({ selected, onClick, icon, label, desc }: { selected: boolean; onClick: () => void; icon: React.ReactNode; label: string; desc: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-xl p-4 text-left" style={{ background: selected ? BRAND_SOFT : CARD, border: `1px solid ${selected ? BRAND : BORDER}` }}>
      {icon}
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: TEXT }}>{label}</p>
        <p className="text-[11px]" style={{ color: MUTED }}>{desc}</p>
      </div>
      {selected && <Check size={16} color={BRAND_STRONG} />}
    </button>
  );
}
