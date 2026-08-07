import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Produto, Adicional } from "./tipos";

export interface ItemCarrinho {
  uid: string;
  produto: Produto;
  quantidade: number;
  adicionais: Adicional[];
  obs?: string;
  lojaId: string;
}

interface Ctx {
  itens: ItemCarrinho[];
  lojaId: string | null;
  adicionar: (p: Produto, qtd: number, adicionais: Adicional[], obs?: string) => void;
  remover: (uid: string) => void;
  ajustar: (uid: string, delta: number) => void;
  limpar: () => void;
  subtotal: number;
  totalItens: number;
}

const CarrinhoCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "boraze:pedir:carrinho:v1";

interface Persisted {
  itens: ItemCarrinho[];
  lojaId: string | null;
}

function carregar(): Persisted {
  if (typeof window === "undefined") return { itens: [], lojaId: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { itens: [], lojaId: null };
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed || !Array.isArray(parsed.itens)) return { itens: [], lojaId: null };
    return parsed;
  } catch {
    return { itens: [], lojaId: null };
  }
}

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [lojaId, setLojaId] = useState<string | null>(null);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    const p = carregar();
    setItens(p.itens);
    setLojaId(p.lojaId);
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ itens, lojaId }));
    } catch {
      /* ignore */
    }
  }, [itens, lojaId, hidratado]);

  const api = useMemo<Ctx>(() => {
    const subtotal = itens.reduce(
      (acc, i) =>
        acc + i.quantidade * (i.produto.preco + i.adicionais.reduce((s, a) => s + a.preco, 0)),
      0
    );
    return {
      itens,
      lojaId,
      subtotal,
      totalItens: itens.reduce((a, i) => a + i.quantidade, 0),
      adicionar(p, qtd, adicionais, obs) {
        setItens((prev) => {
          const trocouLoja = lojaId && lojaId !== p.lojaId;
          const base = trocouLoja ? [] : prev;
          setLojaId(p.lojaId);
          return [
            ...base,
            {
              uid: `${p.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              produto: p,
              quantidade: qtd,
              adicionais,
              obs,
              lojaId: p.lojaId,
            },
          ];
        });
      },
      remover(uid) {
        setItens((prev) => {
          const next = prev.filter((i) => i.uid !== uid);
          if (next.length === 0) setLojaId(null);
          return next;
        });
      },
      ajustar(uid, delta) {
        setItens((prev) =>
          prev
            .map((i) =>
              i.uid === uid ? { ...i, quantidade: Math.max(0, i.quantidade + delta) } : i
            )
            .filter((i) => i.quantidade > 0)
        );
      },
      limpar() {
        setItens([]);
        setLojaId(null);
      },
    };
  }, [itens, lojaId]);

  return <CarrinhoCtx.Provider value={api}>{children}</CarrinhoCtx.Provider>;
}

export function useCarrinho() {
  const ctx = useContext(CarrinhoCtx);
  if (!ctx) throw new Error("useCarrinho fora do CarrinhoProvider");
  return ctx;
}

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
