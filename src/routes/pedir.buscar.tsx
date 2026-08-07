import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ArrowLeft, Star, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/pedir/carrinho";
import { mapLoja, mapProduto } from "@/lib/pedir/db";
import type { Loja, Produto } from "@/lib/pedir/tipos";
import { toast } from "sonner";

export const Route = createFileRoute("/pedir/buscar")({ component: Buscar });

function Buscar() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [produtos, setProdutos] = useState<(Produto & { lojaNome: string })[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      try {
        if (debounced === "") {
          const { data } = await supabase
            .from("food_lojas")
            .select("*")
            .eq("ativo", true)
            .order("avaliacao", { ascending: false })
            .limit(30);
          setLojas((data ?? []).map(mapLoja));
          setProdutos([]);
        } else {
          const [{ data: dl, error: e1 }, { data: dp, error: e2 }] = await Promise.all([
            supabase
              .from("food_lojas")
              .select("*")
              .eq("ativo", true)
              .ilike("nome", `%${debounced}%`)
              .limit(20),
            supabase
              .from("food_produtos")
              .select("*, food_lojas!inner(nome, ativo)")
              .eq("disponivel", true)
              .eq("food_lojas.ativo", true)
              .ilike("nome", `%${debounced}%`)
              .limit(20),
          ]);
          if (e1 || e2) throw e1 ?? e2;
          setLojas((dl ?? []).map(mapLoja));
          setProdutos(
            (dp ?? []).map((r) => ({
              ...mapProduto(r as never),
              lojaNome: (r as { food_lojas: { nome: string } }).food_lojas.nome,
            }))
          );
        }
      } catch {
        toast.error("Não foi possível concluir a busca, tente novamente");
      } finally {
        setCarregando(false);
      }
    })();
  }, [debounced]);

  const vazio = useMemo(
    () => !carregando && lojas.length === 0 && produtos.length === 0,
    [carregando, lojas, produtos]
  );

  return (
    <div>
      <header className="sticky top-0 z-30 p-3 flex items-center gap-2" style={{ background: "var(--dz-bg)", borderBottom: "1px solid var(--dz-line)" }}>
        <Link to="/pedir" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--dz-surface-2)" }}>
          <ArrowLeft size={18} color="var(--dz-ink)" />
        </Link>
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" color="var(--dz-muted)" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="dz-input"
            placeholder="O que você quer pedir?"
          />
        </div>
      </header>

      <main className="p-4 flex flex-col gap-6">
        {produtos.length > 0 && (
          <section>
            <h3 className="dz-h2 mb-2">Pratos</h3>
            <ul className="flex flex-col gap-2">
              {produtos.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/pedir/produto/$id"
                    params={{ id: p.id }}
                    className="dz-card dz-card-hover flex items-center gap-3 p-3"
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0" style={{ background: "var(--dz-surface-3)" }}>
                      {p.imagem && <img src={p.imagem} alt={p.nome} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold truncate text-[color:var(--dz-ink)]">{p.nome}</p>
                      <p className="dz-caption truncate">{p.lojaNome}</p>
                    </div>
                    <span className="text-[14px] font-black text-[color:var(--dz-ink)]">{formatBRL(p.preco)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="dz-h2 mb-2">Restaurantes</h3>
          <ul className="flex flex-col gap-2">
            {lojas.map((l) => (
              <li key={l.id}>
                <Link
                  to="/pedir/loja/$id"
                  params={{ id: l.id }}
                  className="dz-card dz-card-hover flex items-stretch"
                >
                  <div className="w-20 shrink-0" style={{ background: "var(--dz-surface-3)" }}>
                    {l.imagem && <img src={l.imagem} alt={l.nome} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-bold truncate text-[color:var(--dz-ink)]">{l.nome}</p>
                      <span className="flex items-center gap-0.5 text-[12px] font-bold shrink-0 text-[color:var(--dz-ink)]">
                        <Star size={12} color="var(--dz-star)" fill="var(--dz-star)" />
                        {l.avaliacao.toFixed(1)}
                      </span>
                    </div>
                    <p className="dz-caption mt-0.5 truncate">{l.categoria}</p>
                    <p className="text-[12px] mt-1 text-[color:var(--dz-ink-2)] flex items-center gap-1">
                      <Clock size={12} /> {l.tempoMin}-{l.tempoMax} min • {l.taxa === 0 ? "Grátis" : formatBRL(l.taxa)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {carregando && <p className="dz-caption text-center">Buscando…</p>}
        {vazio && <p className="dz-caption text-center">Nada encontrado para "{debounced}".</p>}
      </main>
    </div>
  );
}
