import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mapProduto } from "@/lib/pedir/db";
import type { Produto, Adicional } from "@/lib/pedir/tipos";
import { formatBRL, useCarrinho } from "@/lib/pedir/carrinho";
import { toast } from "sonner";

export const Route = createFileRoute("/pedir/produto/$id")({ component: ProdutoPage });

const BRAND = "var(--dz-brand)";
const BRAND_STRONG = "var(--dz-brand-strong)";
const BRAND_INK = "var(--dz-brand-ink)";
const BG = "var(--dz-bg)";
const CARD = "var(--dz-surface)";
const CARD_2 = "var(--dz-surface-2)";
const CARD_3 = "var(--dz-surface-3)";
const BORDER = "var(--dz-line)";
const TEXT = "var(--dz-ink)";
const MUTED = "var(--dz-muted)";

function ProdutoPage() {
  const { id } = useParams({ from: "/pedir/produto/$id" });
  const [p, setP] = useState<Produto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [qtd, setQtd] = useState(1);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [obs, setObs] = useState("");
  const { adicionar } = useCarrinho();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setCarregando(true);
      try {
        const { data: prod, error } = await supabase
          .from("food_produtos")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!prod) {
          setP(null);
          return;
        }
        const { data: adics } = await supabase
          .from("food_adicionais")
          .select("*")
          .eq("produto_id", id)
          .eq("ativo", true)
          .order("ordem", { ascending: true });
        setP(mapProduto(prod, undefined, adics ?? []));
      } catch {
        toast.error("Não foi possível carregar o produto");
      } finally {
        setCarregando(false);
      }
    })();
  }, [id]);

  if (carregando) return <p className="p-6" style={{ color: TEXT, fontFamily: "var(--dz-font)" }}>Carregando…</p>;
  if (!p) return <p className="p-6" style={{ color: TEXT, fontFamily: "var(--dz-font)" }}>Produto não encontrado.</p>;

  const adicionais: Adicional[] = (p.adicionais ?? []).filter((a) => sel[a.id]);
  const total = (p.preco + adicionais.reduce((s, a) => s + a.preco, 0)) * qtd;

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "var(--dz-font)" }}>
      <div className="relative h-56">
        {p.imagem ? (
          <img src={p.imagem} alt={p.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: CARD_3 }} />
        )}
        <Link to="/pedir/loja/$id" params={{ id: p.lojaId }} className="absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "var(--dz-shadow-1)" }}>
          <ArrowLeft size={18} color={TEXT} />
        </Link>
      </div>

      <main className="p-4 flex flex-col gap-5">
        <div>
          <h1 className="text-lg font-black" style={{ color: TEXT }}>{p.nome}</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>{p.descricao}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-black" style={{ color: BRAND_STRONG }}>{formatBRL(p.preco)}</span>
            {p.precoDe && <span className="text-xs line-through" style={{ color: MUTED }}>{formatBRL(p.precoDe)}</span>}
          </div>
        </div>

        {p.adicionais && p.adicionais.length > 0 && (
          <section>
            <h3 className="text-sm font-bold mb-2" style={{ color: TEXT }}>Adicionais</h3>
            <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {p.adicionais.map((a) => (
                <label key={a.id} className="flex items-center gap-3 p-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <input type="checkbox" checked={!!sel[a.id]} onChange={(e) => setSel((s) => ({ ...s, [a.id]: e.target.checked }))} />
                  <span className="flex-1 text-sm" style={{ color: TEXT }}>{a.nome}</span>
                  <span className="text-xs font-semibold" style={{ color: BRAND_STRONG }}>+ {formatBRL(a.preco)}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-sm font-bold mb-2" style={{ color: TEXT }}>Observações</h3>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: sem cebola, ponto da carne..."
            className="w-full rounded-xl p-3 text-sm outline-none resize-none"
            rows={3}
            style={{ background: CARD_2, border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </section>
      </main>

      <div className="fixed left-0 right-0 bottom-0 p-4 pb-20 z-30" style={{ background: `linear-gradient(to top, ${BG} 60%, transparent)` }}>
        <div className="flex gap-3 items-center max-w-[460px] mx-auto">
          <div className="flex items-center gap-3 rounded-full px-3 py-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <button onClick={() => setQtd((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: CARD_3 }}><Minus size={14} color={TEXT} /></button>
            <span className="w-4 text-center font-bold" style={{ color: TEXT }}>{qtd}</span>
            <button onClick={() => setQtd((q) => q + 1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: CARD_3 }}><Plus size={14} color={TEXT} /></button>
          </div>
          <button
            onClick={() => { adicionar(p, qtd, adicionais, obs || undefined); navigate({ to: "/pedir/carrinho" }); }}
            className="flex-1 rounded-full px-4 py-3 font-black text-sm flex items-center justify-between"
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
