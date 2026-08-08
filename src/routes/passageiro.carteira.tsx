import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatBRL } from "@/lib/pricing";
import { PassageiroTabBar } from "@/components/passageiro-tab-bar";
import { EmojiIcon } from "@/components/emoji-icon";

export const Route = createFileRoute("/passageiro/carteira")({
  component: PassageiroCarteira,
});

type Carteira = { saldo_disponivel: number; saldo_pendente: number };
type Transacao = {
  id: string;
  tipo: string;
  valor: number;
  descricao: string | null;
  criado_em: string;
};

const ICONES: Record<string, { icon: string; color: string; label: string }> = {
  recarga_pix: { icon: "", color: "#22c55e", label: "Recarga Pix" },
  recarga_cartao: { icon: "", color: "#22c55e", label: "Recarga cartão" },
  pagamento_corrida: { icon: "", color: "#a855f7", label: "Corrida paga" },
  corrida_gratuita: { icon: "", color: "#eab308", label: "Corrida grátis" },
  corrida_aniversario: { icon: "", color: "#ec4899", label: "Aniversário" },
  estorno: { icon: "↩️", color: "#f97316", label: "Estorno" },
};

function PassageiroCarteira() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [carteiraAtiva, setCarteiraAtiva] = useState<boolean | null>(null);
  const [carteira, setCarteira] = useState<Carteira>({ saldo_disponivel: 0, saldo_pendente: 0 });
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [valorRecarga, setValorRecarga] = useState<number>(20);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth/passageiro" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const cfg = await supabase
        .from("configuracoes_plataforma")
        .select("valor")
        .eq("chave", "carteira_ativa")
        .maybeSingle();
      const ativa = cfg.data?.valor === "true";
      setCarteiraAtiva(ativa);
      if (!ativa) {
        setLoading(false);
        return;
      }
      const [w, t] = await Promise.all([
        supabase
          .from("carteira_passageiro")
          .select("saldo_disponivel,saldo_pendente")
          .eq("passageiro_id", user.id)
          .maybeSingle(),
        supabase
          .from("transacoes_carteira_passageiro")
          .select("id,tipo,valor,descricao,criado_em")
          .eq("passageiro_id", user.id)
          .order("criado_em", { ascending: false })
          .limit(50),
      ]);
      if (w.data) setCarteira(w.data as Carteira);
      if (t.data) setTransacoes(t.data as Transacao[]);
      setLoading(false);
    })();
  }, [user]);

  function handleRecarregar() {
    toast.info(`Recarga de ${formatBRL(valorRecarga)} via Pix em breve — integração de pagamento ainda não está ativa.`);
  }

  if (authLoading || loading || carteiraAtiva === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="spinner-mz" />
      </main>
    );
  }

  if (!carteiraAtiva) {
    return (
      <main
        className="min-h-screen bg-background text-foreground px-6 py-10 flex flex-col items-center justify-center gap-4 text-center"
        style={{ paddingBottom: 80 }}
      >
        <div className="text-5xl"><EmojiIcon e="💳" /></div>
        <h1 className="text-xl font-bold">Carteira em breve</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          A carteira digital ainda não foi liberada. Por enquanto pague suas corridas direto com o mototaxista.
        </p>
        <Link to="/passageiro/home" className="btn-cta">Voltar</Link>
        <PassageiroTabBar />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground" style={{ paddingBottom: 80 }}>
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold">Minha Carteira</h1>
      </header>

      <section className="px-5 grid grid-cols-2 gap-3">
        <div className="card-mz p-4">
          <div className="text-xs text-muted-foreground">Saldo disponível</div>
          <div className="text-2xl font-extrabold mt-1" style={{ color: "var(--color-neon)" }}>
            {formatBRL(carteira.saldo_disponivel)}
          </div>
        </div>
        <div className="card-mz p-4">
          <div className="text-xs text-muted-foreground">Saldo pendente</div>
          <div className="text-2xl font-extrabold mt-1">{formatBRL(carteira.saldo_pendente)}</div>
        </div>
      </section>

      <section className="px-5 mt-4 card-mz p-4">
        <div className="font-bold text-sm mb-3">Recarregar</div>
        <div className="grid grid-cols-4 gap-2">
          {[20, 50, 100].map((v) => (
            <button
              key={v}
              onClick={() => setValorRecarga(v)}
              className={`p-2 rounded-md text-sm font-bold border-2 ${valorRecarga === v ? "border-[color:var(--color-neon)]" : "border-transparent bg-background/30"}`}
            >
              R${v}
            </button>
          ))}
          <input
            type="number"
            min={20}
            value={valorRecarga}
            onChange={(e) => setValorRecarga(Number(e.target.value) || 0)}
            className="input-mz !py-1 !px-2 text-sm"
          />
        </div>
        <button onClick={handleRecarregar} className="btn-cta w-full mt-3" disabled={valorRecarga < 20}>
          RECARREGAR {formatBRL(valorRecarga)}
        </button>
        <div className="text-xs text-muted-foreground mt-2 text-center">Pix ou cartão (Stripe — em breve)</div>
      </section>

      <section className="px-5 mt-4">
        <div className="font-bold text-sm mb-2">Extrato</div>
        <div className="flex flex-col gap-2">
          {transacoes.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6 card-mz">
              Nenhuma transação ainda.
            </div>
          )}
          {transacoes.map((t) => {
            const info = ICONES[t.tipo] ?? { icon: "•", color: "#fff", label: t.tipo };
            return (
              <div key={t.id} className="card-mz p-3 flex items-center gap-3">
                <div className="size-9 rounded-full flex items-center justify-center text-lg" style={{ background: `${info.color}33` }}>
                  {info.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{info.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.criado_em).toLocaleString("pt-BR")}
                  </div>
                  {t.descricao && <div className="text-xs text-muted-foreground">{t.descricao}</div>}
                </div>
                <div className="text-sm font-bold" style={{ color: info.color }}>
                  {formatBRL(t.valor)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <PassageiroTabBar />
    </main>
  );
}
