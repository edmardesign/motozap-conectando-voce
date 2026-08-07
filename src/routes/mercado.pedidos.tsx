import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Bike, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/mercado/carrinho";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/mercado/pedidos")({ component: Pedidos });

const BRAND = "var(--dz-brand)";
const BRAND_STRONG = "var(--dz-brand-strong)";
const BG = "var(--dz-bg)";
const CARD = "var(--dz-surface)";
const BORDER = "var(--dz-line)";
const TEXT = "var(--dz-ink)";
const MUTED = "var(--dz-muted)";
const DANGER = "var(--dz-danger)";

type Status = Database["public"]["Enums"]["mercado_status_pedido"];
interface PedidoLinha {
  id: string;
  numero: number;
  status: Status;
  total: number;
  itens: number;
  lojaNome: string;
  criadoEm: string;
}

const EM_ANDAMENTO: Status[] = ["novo", "confirmado", "em_preparo", "pronto", "em_entrega"];

function Pedidos() {
  const { user, loading } = useAuth();
  const [linhas, setLinhas] = useState<PedidoLinha[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { setLinhas([]); setCarregando(false); return; }
    (async () => {
      setCarregando(true);
      const { data } = await supabase
        .from("mercado_pedidos")
        .select("id, numero_pedido, status, total, created_at, mercado_lojas(nome), mercado_pedido_itens(quantidade)")
        .eq("cliente_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const mapped: PedidoLinha[] = (data ?? []).map((p) => {
        const loja = (p as unknown as { mercado_lojas: { nome: string } | null }).mercado_lojas;
        const its = (p as unknown as { mercado_pedido_itens: { quantidade: number }[] }).mercado_pedido_itens ?? [];
        return {
          id: p.id,
          numero: p.numero_pedido,
          status: p.status,
          total: Number(p.total),
          itens: its.reduce((s, i) => s + i.quantidade, 0),
          lojaNome: loja?.nome ?? "—",
          criadoEm: p.created_at,
        };
      });
      setLinhas(mapped);
      setCarregando(false);
    })();
  }, [user, loading]);

  const emAndamento = linhas.filter((p) => EM_ANDAMENTO.includes(p.status));
  const historico = linhas.filter((p) => !EM_ANDAMENTO.includes(p.status));

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "var(--dz-font)", minHeight: "100dvh" }}>
      <header style={{ background: BG, padding: "20px 16px", borderBottom: `1px solid ${BORDER}` }}>
        <h1 className="text-xl font-black" style={{ color: TEXT }}>Meus pedidos</h1>
      </header>

      <main className="p-4 flex flex-col gap-5">
        {!user && !loading && (
          <p className="text-sm" style={{ color: MUTED }}>
            <Link to="/passageiro" className="underline" style={{ color: BRAND_STRONG }}>Faça login</Link> para ver seus pedidos.
          </p>
        )}

        {carregando && <p className="text-sm" style={{ color: MUTED }}>Carregando…</p>}

        {emAndamento.length > 0 && (
          <section>
            <h3 className="text-sm font-bold mb-2" style={{ color: TEXT }}>Em andamento</h3>
            <div className="flex flex-col gap-2">
              {emAndamento.map((p) => (
                <Link
                  key={p.id}
                  to="/mercado/acompanhar/$id"
                  params={{ id: p.id }}
                  className="block rounded-xl p-4"
                  style={{ background: CARD, border: `1px solid ${BRAND}`, boxShadow: "var(--dz-shadow-1)" }}
                >
                  <div className="flex items-center gap-2">
                    <Bike size={18} color={BRAND_STRONG} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND_STRONG }}>
                      {labelStatus(p.status)}
                    </span>
                  </div>
                  <p className="text-base font-semibold mt-2" style={{ color: TEXT }}>{p.lojaNome}</p>
                  <p className="text-[11px]" style={{ color: MUTED }}>Nº {p.numero} • {p.itens} {p.itens === 1 ? "item" : "itens"} • {formatBRL(p.total)}</p>
                  <div className="mt-3 flex items-center gap-2 text-[11px]" style={{ color: MUTED }}>
                    <Clock size={12} /> Previsão de entrega em 20-30min
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {historico.length > 0 && (
          <section>
            <h3 className="text-sm font-bold mb-2" style={{ color: TEXT }}>Histórico</h3>
            <div className="flex flex-col gap-2">
              {historico.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "var(--dz-shadow-1)" }}>
                  {p.status === "cancelado" ? (
                    <XCircle size={18} color={DANGER} />
                  ) : (
                    <CheckCircle2 size={18} color={BRAND_STRONG} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>{p.lojaNome}</p>
                    <p className="text-[11px]" style={{ color: MUTED }}>
                      Nº {p.numero} • {p.itens} {p.itens === 1 ? "item" : "itens"} • {formatarData(p.criadoEm)} • {labelStatus(p.status)}
                    </p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: p.status === "cancelado" ? DANGER : BRAND_STRONG }}>
                    {formatBRL(p.total)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {!carregando && user && linhas.length === 0 && (
          <p className="text-sm" style={{ color: MUTED }}>Você ainda não fez nenhum pedido.</p>
        )}
      </main>
    </div>
  );
}

function labelStatus(s: Status): string {
  switch (s) {
    case "novo": return "aguardando";
    case "confirmado": return "aceito";
    case "em_preparo": return "em preparo";
    case "pronto": return "pronto";
    case "em_entrega": return "a caminho";
    case "entregue": return "entregue";
    case "cancelado": return "cancelado";
  }
}

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}
