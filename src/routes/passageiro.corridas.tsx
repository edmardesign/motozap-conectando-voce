import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatBRL } from "@/lib/pricing";
import { PassageiroTabBar } from "@/components/passageiro-tab-bar";
import { MapPin, Navigation } from "lucide-react";
import { EmojiIcon } from "@/components/emoji-icon";
import { PassageiroHeader } from "@/components/passageiro-header";

export const Route = createFileRoute("/passageiro/corridas")({
  component: PassageiroCorridas,
  validateSearch: (s: Record<string, unknown>) => ({
    historico: s.historico === "1" || s.historico === 1 ? "1" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Solicitações — InterGO" },
      {
        name: "description",
        content:
          "Acompanhe as solicitações de transporte institucional e o histórico de entregas da sua secretaria na InterGO.",
      },
      { property: "og:title", content: "Solicitações — InterGO" },
      {
        property: "og:description",
        content: "Acompanhe solicitações e histórico de transporte institucional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Corrida = {
  id: string;
  descricao?: string | null;
  origem_endereco: string;
  destino_endereco: string;
  status: string;
  valor_estimado: number;
  valor_final: number | null;
  criado_em: string;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  aguardando: { label: "Aguardando", color: "#eab308" },
  aceita: { label: "Aceita", color: "#3b82f6" },
  em_andamento: { label: "Em andamento", color: "#3b82f6" },
  concluida: { label: "Concluída", color: "#22c55e" },
  cancelada: { label: "Cancelada", color: "#ef4444" },
};

function PassageiroCorridas() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { historico } = Route.useSearch();
  const isHistorico = historico === "1";
  const [corridas, setCorridas] = useState<Corrida[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth/passageiro" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("corridas")
        .select("id,descricao,origem_endereco,destino_endereco,status,valor_estimado,valor_final,criado_em")
        .eq("passageiro_id", user.id)
        .order("criado_em", { ascending: false })
        .limit(50);
      if (data) setCorridas(data as Corrida[]);
      setLoading(false);
    })();
  }, [user]);

  const lista = corridas.filter((c) =>
    isHistorico
      ? c.status === "concluida" || c.status === "cancelada"
      : c.status !== "concluida" && c.status !== "cancelada",
  );

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="spinner-mz" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-grouped pb-24 text-foreground">
      <PassageiroHeader title={isHistorico ? "Histórico" : "Viagens"} />
      <div className="mx-auto max-w-lg px-5 pt-5">
        <p className="text-sm text-muted-foreground">
          {isHistorico
            ? "Solicitações concluídas e canceladas"
            : "Transportes institucionais em andamento"}
        </p>
        </p>
      </div>

      <section className="mx-auto max-w-lg px-5">
        {lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
            <div className="text-6xl"><EmojiIcon e="📦" /></div>
            <h2 className="text-lg font-bold">
              {isHistorico ? "Nenhuma solicitação finalizada" : "Nenhuma solicitação ativa"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              {isHistorico
                ? "As solicitações concluídas ou canceladas aparecem aqui."
                : "Crie uma solicitação de transporte na tela inicial."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {lista.map((c) => {
              const st = STATUS_LABEL[c.status] ?? { label: c.status, color: "#9ca3af" };
              const valor = c.valor_final ?? c.valor_estimado;
              return (
                <div key={c.id} className="card-mz p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full"
                      style={{ background: `${st.color}22`, color: st.color }}
                    >
                      {st.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {c.descricao && (
                    <div className="text-sm font-semibold mb-1">{c.descricao}</div>
                  )}
                  <div className="flex items-start gap-2 text-sm mb-1">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.origem_endereco}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Navigation size={14} className="mt-0.5 shrink-0" style={{ color: "var(--color-neon)" }} />
                    <span className="truncate">{c.destino_endereco}</span>
                  </div>
                  <div className="mt-2 text-right text-sm font-bold" style={{ color: "var(--color-neon)" }}>
                    {formatBRL(valor)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PassageiroTabBar />
    </main>
  );
}
