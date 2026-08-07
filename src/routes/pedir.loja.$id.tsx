import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Star, Clock, MapPin, Search, Info, Heart, Share2, Plus, Minus, X, Flame, ShoppingBag } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, useCarrinho } from "@/lib/pedir/carrinho";
import { mapLoja, mapProduto } from "@/lib/pedir/db";
import type { Loja, Produto } from "@/lib/pedir/tipos";
import { toast } from "sonner";

export const Route = createFileRoute("/pedir/loja/$id")({ component: LojaPage });

const BRAND = "var(--dz-brand)";
const BRAND_STRONG = "var(--dz-brand-strong)";
const BRAND_INK = "var(--dz-brand-ink)";
const BRAND_SOFT = "var(--dz-brand-soft)";
const BG = "var(--dz-bg)";
const CARD = "var(--dz-surface)";
const CARD_2 = "var(--dz-surface-2)";
const CARD_3 = "var(--dz-surface-3)";
const BORDER = "var(--dz-line)";
const BORDER_STRONG = "var(--dz-line-strong)";
const TEXT = "var(--dz-ink)";
const MUTED = "var(--dz-muted)";
const SEM_CAT = "Cardápio";

function LojaPage() {
  const { id } = useParams({ from: "/pedir/loja/$id" });
  const [loja, setLoja] = useState<Loja | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<Produto | null>(null);
  const [cat, setCat] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);
  const [buscaCard, setBuscaCard] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { totalItens, subtotal } = useCarrinho();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 140);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      try {
        const [{ data: lojaRow, error: eL }, { data: catRows }, { data: prodRows, error: eP }] =
          await Promise.all([
            supabase.from("food_lojas").select("*").eq("id", id).maybeSingle(),
            supabase
              .from("food_categorias_cardapio")
              .select("*")
              .eq("loja_id", id)
              .eq("ativa", true)
              .order("ordem", { ascending: true }),
            supabase
              .from("food_produtos")
              .select("*")
              .eq("loja_id", id)
              .eq("disponivel", true)
              .order("ordem", { ascending: true }),
          ]);
        if (eL || eP) throw eL ?? eP;
        if (!lojaRow) {
          setLoja(null);
          return;
        }
        setLoja(mapLoja(lojaRow));
        const catMap = Object.fromEntries((catRows ?? []).map((c) => [c.id, c.nome]));
        const prods = (prodRows ?? []).map((r) => mapProduto(r, catMap));
        setProdutos(prods);
        const primeiraCat =
          (catRows ?? []).find((c) => prods.some((p) => p.categoriaId === c.id))?.nome ??
          (prods.some((p) => !p.categoriaId) ? SEM_CAT : "");
        setCat(primeiraCat);
      } catch {
        toast.error("Não foi possível carregar o restaurante, tente novamente");
      } finally {
        setCarregando(false);
      }
    })();
  }, [id]);

  const categorias = useMemo(() => {
    const nomes: string[] = [];
    for (const p of produtos) {
      const n = p.categoriaNome ?? SEM_CAT;
      if (!nomes.includes(n)) nomes.push(n);
    }
    return nomes;
  }, [produtos]);

  const maisPedidos = useMemo(() => produtos.filter((p) => p.destaque).slice(0, 8), [produtos]);

  const listagemCat = useMemo(() => {
    const q = buscaCard.trim().toLowerCase();
    return produtos.filter((p) => {
      const n = p.categoriaNome ?? SEM_CAT;
      if (n !== cat) return false;
      if (!q) return true;
      return p.nome.toLowerCase().includes(q) || p.descricao.toLowerCase().includes(q);
    });
  }, [produtos, cat, buscaCard]);

  if (carregando) return <p className="p-6" style={{ color: TEXT, fontFamily: "var(--dz-font)" }}>Carregando…</p>;
  if (!loja) return <p className="p-6" style={{ color: TEXT, fontFamily: "var(--dz-font)" }}>Loja não encontrada.</p>;

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "var(--dz-font)" }}>
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 transition-all"
        style={{
          height: 56,
          paddingTop: "calc(env(safe-area-inset-top,0px) + 8px)",
          background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
          borderBottom: scrolled ? `1px solid ${BORDER}` : "1px solid transparent",
          backdropFilter: scrolled ? "blur(8px)" : "none",
        }}
      >
        <Link to="/pedir" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: CARD, border: `1px solid ${BORDER_STRONG}`, boxShadow: "var(--dz-shadow-1)" }}>
          <ArrowLeft size={18} color={TEXT} />
        </Link>
        {scrolled && <p className="text-sm font-bold truncate flex-1 mx-3 text-center" style={{ color: TEXT }}>{loja.nome}</p>}
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: CARD, border: `1px solid ${BORDER_STRONG}`, boxShadow: "var(--dz-shadow-1)" }}>
            <Share2 size={16} color={TEXT} />
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: CARD, border: `1px solid ${BORDER_STRONG}`, boxShadow: "var(--dz-shadow-1)" }}>
            <Heart size={16} color={TEXT} />
          </button>
        </div>
      </div>

      <div className="relative h-48">
        {loja.imagem ? (
          <img src={loja.imagem} alt={loja.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: CARD_3 }} />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 60%, ${BG} 100%)` }} />
      </div>

      <header className="px-4 -mt-14 relative z-10">
        <div className="flex items-end gap-3 mb-3">
          <div className="w-24 h-24 rounded-full overflow-hidden shrink-0" style={{ border: `3px solid ${BRAND}`, boxShadow: "var(--dz-shadow-2)", background: CARD }}>
            {(loja.logo || loja.imagem) && <img src={loja.logo || loja.imagem} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="text-xl font-black leading-tight truncate" style={{ color: TEXT }}>{loja.nome}</h1>
            <p className="text-[12px]" style={{ color: MUTED }}>
              {loja.tags.length ? loja.tags.join(" • ") : loja.categoria}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge><Star size={11} color="var(--dz-star)" fill="var(--dz-star)" /><span style={{ color: TEXT }}>{loja.avaliacao.toFixed(1)}</span></Badge>
          <Badge><span className="w-1.5 h-1.5 rounded-full" style={{ background: loja.aberto && !loja.pausado ? BRAND_STRONG : "var(--dz-danger)" }} />{loja.aberto && !loja.pausado ? "Aberto agora" : "Fechado"}</Badge>
          <Badge><Clock size={11} />{loja.tempoMin}-{loja.tempoMax} min</Badge>
          <Badge><ShoppingBag size={11} />Entrega {loja.taxa === 0 ? "grátis" : formatBRL(loja.taxa)}</Badge>
          {loja.bairro && <Badge><MapPin size={11} />{loja.bairro}</Badge>}
        </div>

        {loja.promo && (
          <div className="mt-1 rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: BRAND_SOFT, border: `1px solid ${BRAND}` }}>
            <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: BRAND }}>
              <Info size={12} color={BRAND_INK} />
            </span>
            <p className="text-[12px] font-semibold" style={{ color: BRAND_INK }}>{loja.promo}</p>
          </div>
        )}
      </header>

      <div className="px-4 mt-4">
        <div className="flex items-center gap-2 rounded-full px-4 h-11" style={{ background: CARD_2, border: `1px solid ${BORDER}` }}>
          <Search size={16} style={{ color: BRAND_STRONG }} />
          <input
            value={buscaCard}
            onChange={(e) => setBuscaCard(e.target.value)}
            placeholder="Busque no cardápio…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: TEXT }}
          />
        </div>
      </div>

      {maisPedidos.length > 0 && (
        <section className="mt-5">
          <h3 className="px-4 text-base font-black mb-3 flex items-center gap-2" style={{ color: TEXT }}>
            <Flame size={16} color={BRAND_STRONG} /> Mais pedidos
          </h3>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
            {maisPedidos.map((p) => (
              <button key={p.id} onClick={() => setAberto(p)} className="shrink-0 w-44 rounded-2xl overflow-hidden text-left" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "var(--dz-shadow-1)" }}>
                <div className="h-24" style={{ background: CARD_3 }}>
                  {p.imagem && <img src={p.imagem} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="p-3">
                  <p className="text-[12px] font-bold line-clamp-2 min-h-[32px]" style={{ color: TEXT }}>{p.nome}</p>
                  <p className="text-sm font-black mt-1" style={{ color: BRAND_STRONG }}>{formatBRL(p.preco)}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {categorias.length > 0 && (
        <div
          ref={scrollRef}
          className="sticky z-20 mt-5 px-4 flex gap-2 overflow-x-auto pb-3 pt-3 no-scrollbar"
          style={{ top: 56, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${BORDER}` }}
        >
          {categorias.map((c) => {
            const active = cat === c;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className="whitespace-nowrap px-4 h-9 rounded-full text-[12px] font-bold transition-colors"
                style={{ background: active ? BRAND : CARD_2, color: active ? BRAND_INK : TEXT, border: `1px solid ${active ? BRAND : BORDER_STRONG}` }}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}

      <main className="px-4 pt-5 pb-6">
        {cat && (
          <div>
            <h2 className="text-base font-black mb-3" style={{ color: TEXT }}>{cat}</h2>
            <ul className="flex flex-col gap-3">
              {listagemCat.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setAberto(p)} className="w-full flex gap-3 rounded-2xl p-3 text-left" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "var(--dz-shadow-1)" }}>
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0" style={{ background: CARD_3, border: `1px solid ${BORDER}` }}>
                      {p.imagem && <img src={p.imagem} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <p className="text-[14px] font-bold" style={{ color: TEXT }}>{p.nome}</p>
                      <p className="text-[11px] line-clamp-2 mt-1" style={{ color: MUTED }}>{p.descricao}</p>
                      <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-black" style={{ color: BRAND_STRONG }}>{formatBRL(p.preco)}</span>
                          {p.precoDe && <span className="text-[11px] line-through" style={{ color: MUTED }}>{formatBRL(p.precoDe)}</span>}
                        </div>
                        <span className="flex items-center gap-1 h-8 px-3 rounded-full text-[12px] font-black shrink-0" style={{ background: BRAND, color: BRAND_INK }}>
                          <Plus size={14} strokeWidth={3} /> Adicionar
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {listagemCat.length === 0 && <li className="text-[13px]" style={{ color: MUTED }}>Nenhum item por aqui.</li>}
            </ul>
          </div>
        )}
        {produtos.length === 0 && (
          <p className="text-[13px]" style={{ color: MUTED }}>Este restaurante ainda não cadastrou itens.</p>
        )}
      </main>

      {totalItens > 0 && !aberto && (
        <Link to="/pedir/carrinho" className="fixed left-4 right-4 z-30 flex items-center justify-between rounded-full px-5 py-3.5" style={{ bottom: 84, background: BRAND, color: BRAND_INK, boxShadow: "var(--dz-shadow-3)", maxWidth: 460, margin: "0 auto" }}>
          <span className="font-black text-sm">Ver carrinho • {totalItens} {totalItens === 1 ? "item" : "itens"}</span>
          <span className="font-black text-sm">{formatBRL(subtotal)}</span>
        </Link>
      )}

      {aberto && <ProdutoModal produto={aberto} onClose={() => setAberto(null)} />}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold" style={{ background: CARD_2, border: `1px solid ${BORDER_STRONG}`, color: TEXT }}>
      {children}
    </span>
  );
}

function ProdutoModal({ produto, onClose }: { produto: Produto; onClose: () => void }) {
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const { adicionar } = useCarrinho();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const total = produto.preco * qtd;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(15,20,30,0.45)", fontFamily: "var(--dz-font)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92dvh]" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "var(--dz-shadow-3)" }}>
        <div className="relative h-56 shrink-0">
          {produto.imagem ? (
            <img src={produto.imagem} alt={produto.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: CARD_3 }} />
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: CARD, border: `1px solid ${BORDER_STRONG}`, boxShadow: "var(--dz-shadow-1)" }} aria-label="Fechar">
            <X size={18} color={TEXT} />
          </button>
          <div className="absolute inset-x-0 bottom-0 h-20" style={{ background: `linear-gradient(to top, ${CARD}, transparent)` }} />
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <h2 className="text-lg font-black" style={{ color: TEXT }}>{produto.nome}</h2>
          <p className="text-[13px] mt-1" style={{ color: MUTED }}>{produto.descricao}</p>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-xl font-black" style={{ color: BRAND_STRONG }}>{formatBRL(produto.preco)}</span>
            {produto.precoDe && <span className="text-[12px] line-through" style={{ color: MUTED }}>{formatBRL(produto.precoDe)}</span>}
          </div>

          <div className="mt-5">
            <label className="text-[12px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Alguma observação?</label>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: sem cebola, ponto da carne…" rows={3} className="mt-2 w-full rounded-xl p-3 text-sm outline-none resize-none" style={{ background: CARD_2, border: `1px solid ${BORDER}`, color: TEXT }} />
          </div>
        </div>

        <div className="p-4 flex items-center gap-3 shrink-0" style={{ borderTop: `1px solid ${BORDER}`, background: CARD }}>
          <div className="flex items-center gap-2 rounded-full px-2 py-1.5" style={{ background: CARD_2, border: `1px solid ${BORDER}` }}>
            <button onClick={() => setQtd((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: CARD_3 }} aria-label="Diminuir">
              <Minus size={14} color={TEXT} />
            </button>
            <span className="w-5 text-center font-black" style={{ color: TEXT }}>{qtd}</span>
            <button onClick={() => setQtd((q) => q + 1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: CARD_3 }} aria-label="Aumentar">
              <Plus size={14} color={TEXT} />
            </button>
          </div>
          <button
            onClick={() => {
              adicionar(produto, qtd, [], obs || undefined);
              onClose();
            }}
            className="flex-1 h-12 rounded-full px-4 font-black text-sm flex items-center justify-between"
            style={{ background: BRAND, color: BRAND_INK, boxShadow: "var(--dz-shadow-2)" }}
          >
            <span>Adicionar</span>
            <span>{formatBRL(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
