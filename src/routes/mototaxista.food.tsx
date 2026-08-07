import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Store, Bike, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/mototaxista/food")({
  head: () => ({
    meta: [
      { title: "Entregas Food — Bora Zé! Mototaxista" },
      { name: "description", content: "Aceite pedidos de comida prontos para entrega." },
    ],
  }),
  component: MototaxistaFood,
});

const NEON = "#00FF1A";
const CARD = "#1A2C33";
const BORDER = "rgba(134,150,160,0.15)";
const DIM = "#8696A0";

type Aba = "disponiveis" | "em_curso" | "historico";

type Pedido = {
  id: string;
  numero_pedido: number;
  loja_id: string;
  status: "pronto" | "em_entrega" | "entregue" | "cancelado" | "novo" | "confirmado" | "em_preparo";
  endereco_entrega: string;
  bairro_entrega: string | null;
  taxa_entrega: number;
  total: number;
  pronto_em: string | null;
  entregue_em: string | null;
  entregador_user_id: string | null;
  food_lojas?: { nome: string; endereco: string | null; bairro: string | null } | null;
};

function MototaxistaFood() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>("disponiveis");
  const [online, setOnline] = useState(false);
  const [checkedMoto, setCheckedMoto] = useState(false);
  const [disponiveis, setDisponiveis] = useState<Pedido[]>([]);
  const [emCurso, setEmCurso] = useState<Pedido[]>([]);
  const [historico, setHistorico] = useState<Pedido[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/mototaxista/auth" });
  }, [authLoading, user, navigate]);

  const loadMoto = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("mototaxistas")
      .select("status_disponibilidade")
      .eq("id", user.id)
      .maybeSingle();
    setOnline(data?.status_disponibilidade === "online");
    setCheckedMoto(true);
  }, [user]);

  const loadPedidos = useCallback(async () => {
    if (!user) return;
    const [disp, meus] = await Promise.all([
      supabase
        .from("food_pedidos")
        .select("id,numero_pedido,loja_id,status,endereco_entrega,bairro_entrega,taxa_entrega,total,pronto_em,entregue_em,entregador_user_id,food_lojas(nome,endereco,bairro)")
        .eq("status", "pronto")
        .is("entregador_user_id", null)
        .order("pronto_em", { ascending: true })
        .limit(50),
      supabase
        .from("food_pedidos")
        .select("id,numero_pedido,loja_id,status,endereco_entrega,bairro_entrega,taxa_entrega,total,pronto_em,entregue_em,entregador_user_id,food_lojas(nome,endereco,bairro)")
        .eq("entregador_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setDisponiveis((disp.data as Pedido[] | null) ?? []);
    const meusRows = (meus.data as Pedido[] | null) ?? [];
    setEmCurso(meusRows.filter((p) => p.status === "em_entrega"));
    setHistorico(meusRows.filter((p) => p.status === "entregue" || p.status === "cancelado"));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadMoto();
    loadPedidos();
    const ch = supabase
      .channel("food-mototaxista")
      .on("postgres_changes", { event: "*", schema: "public", table: "food_pedidos" }, () => loadPedidos())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, loadMoto, loadPedidos]);

  async function aceitar(id: string) {
    if (!online) {
      toast.error("Fique online para aceitar entregas");
      return;
    }
    setBusy(id);
    const { error } = await supabase.rpc("mototaxista_aceitar_pedido_food", { _pedido_id: id });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Entrega aceita!");
    setAba("em_curso");
    loadPedidos();
  }

  async function finalizar(id: string) {
    setBusy(id);
    const { error } = await supabase.rpc("mototaxista_marcar_entregue_food", { _pedido_id: id });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Entrega finalizada — valor creditado na carteira");
    loadPedidos();
  }

  if (authLoading || !checkedMoto) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#000" }}>
        <div className="spinner-mz" />
      </main>
    );
  }

  const lista = aba === "disponiveis" ? disponiveis : aba === "em_curso" ? emCurso : historico;

  return (
    <main className="min-h-screen text-white" style={{ background: "#000", paddingBottom: 24 }}>
      <header
        className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10"
        style={{ background: "#0A0A0A", borderBottom: `1px solid ${BORDER}` }}
      >
        <Link to="/mototaxista/home" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: CARD }}>
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-black">Entregas Food</h1>
          <p className="text-[11px]" style={{ color: DIM }}>
            {online ? "🟢 Online" : "⚫ Offline — ative na home"}
          </p>
        </div>
      </header>

      <nav className="flex px-4 pt-3 gap-2">
        {(["disponiveis", "em_curso", "historico"] as Aba[]).map((k) => {
          const label = k === "disponiveis" ? "Disponíveis" : k === "em_curso" ? "Em curso" : "Histórico";
          const count = k === "disponiveis" ? disponiveis.length : k === "em_curso" ? emCurso.length : historico.length;
          const active = aba === k;
          return (
            <button
              key={k}
              onClick={() => setAba(k)}
              className="flex-1 py-2 rounded-lg text-[13px] font-bold"
              style={{
                background: active ? NEON : CARD,
                color: active ? "#000" : "#fff",
                border: `1px solid ${BORDER}`,
              }}
            >
              {label} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          );
        })}
      </nav>

      <section className="px-4 pt-4 space-y-3">
        {lista.length === 0 && (
          <div className="rounded-xl p-6 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-sm" style={{ color: DIM }}>
              {aba === "disponiveis"
                ? online
                  ? "Nenhum pedido pronto no momento."
                  : "Fique online para receber ofertas."
                : aba === "em_curso"
                ? "Nenhuma entrega em andamento."
                : "Nenhuma entrega no histórico."}
            </p>
          </div>
        )}

        {lista.map((p) => (
          <article key={p.id} className="rounded-xl p-4 space-y-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store size={16} style={{ color: NEON }} />
                <div>
                  <div className="text-[14px] font-bold">{p.food_lojas?.nome ?? "Loja"}</div>
                  <div className="text-[11px]" style={{ color: DIM }}>Pedido #{p.numero_pedido}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px]" style={{ color: DIM }}>Você recebe</div>
                <div className="text-lg font-black" style={{ color: NEON }}>{formatBRL(Number(p.taxa_entrega))}</div>
              </div>
            </div>

            <div className="space-y-1.5 text-[13px]">
              {p.food_lojas?.endereco && (
                <div className="flex gap-2">
                  <Store size={14} className="mt-0.5 shrink-0" style={{ color: DIM }} />
                  <span>
                    Retirar: {p.food_lojas.endereco}
                    {p.food_lojas.bairro ? ` • ${p.food_lojas.bairro}` : ""}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: DIM }} />
                <span>
                  Entregar: {p.endereco_entrega}
                  {p.bairro_entrega ? ` • ${p.bairro_entrega}` : ""}
                </span>
              </div>
              {p.entregue_em && (
                <div className="flex gap-2 pt-1" style={{ color: DIM }}>
                  <CheckCircle2 size={14} className="mt-0.5" />
                  <span className="text-[12px]">Entregue em {new Date(p.entregue_em).toLocaleString("pt-BR")}</span>
                </div>
              )}
              {aba === "disponiveis" && p.pronto_em && (
                <div className="flex gap-2 pt-1" style={{ color: DIM }}>
                  <Clock size={14} className="mt-0.5" />
                  <span className="text-[12px]">Pronto há {tempoRelativo(p.pronto_em)}</span>
                </div>
              )}
            </div>

            {aba === "disponiveis" && (
              <button
                onClick={() => aceitar(p.id)}
                disabled={busy === p.id || !online}
                className="w-full py-3 rounded-lg font-black text-[14px] flex items-center justify-center gap-2"
                style={{
                  background: online ? NEON : "#333",
                  color: online ? "#000" : DIM,
                  opacity: busy === p.id ? 0.6 : 1,
                }}
              >
                <Bike size={16} />
                {busy === p.id ? "Aceitando..." : "ACEITAR ENTREGA"}
              </button>
            )}
            {aba === "em_curso" && (
              <div className="flex gap-2">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(p.endereco_entrega)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 rounded-lg font-bold text-[13px] text-center"
                  style={{ background: CARD, border: `1px solid ${NEON}`, color: NEON }}
                >
                  ROTA
                </a>
                <button
                  onClick={() => finalizar(p.id)}
                  disabled={busy === p.id}
                  className="flex-1 py-3 rounded-lg font-black text-[13px]"
                  style={{ background: NEON, color: "#000", opacity: busy === p.id ? 0.6 : 1 }}
                >
                  {busy === p.id ? "..." : "ENTREGUE"}
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}

function tempoRelativo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}min`;
}
