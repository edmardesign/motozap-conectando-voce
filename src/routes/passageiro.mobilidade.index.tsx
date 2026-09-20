import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Car, Bike, AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { minhaCotaMobilidade, solicitarLiberacaoCota, type CotaMensal } from "@/lib/cotas.functions";
import { AvisoMobilidadeBanner } from "@/components/aviso-mobilidade";
import { PassageiroHeader } from "@/components/passageiro-header";
import { PassageiroTabBar } from "@/components/passageiro-tab-bar";


export const Route = createFileRoute("/passageiro/mobilidade/")({
  head: () => ({
    meta: [
      { title: "Mobilidade Urbana — Intergo Logística" },
      { name: "description", content: "Solicite automóvel ou moto táxi para deslocamento de servidores." },
      { property: "og:title", content: "Mobilidade Urbana — Intergo Logística" },
      { property: "og:description", content: "Solicite automóvel ou moto táxi para deslocamento de servidores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MobilidadeEscolhaPage,
});

function MobilidadeEscolhaPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const buscarCota = useServerFn(minhaCotaMobilidade);
  const pedirLiberacao = useServerFn(solicitarLiberacaoCota);

  const [cota, setCota] = useState<CotaMensal | null>(null);
  const [modalLimite, setModalLimite] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancel = false;
    (async () => {
      try {
        const c = await buscarCota();
        if (!cancel) setCota(c);
      } catch {
        /* silencioso: a tela continua utilizável */
      }
    })();
    return () => {
      cancel = true;
    };
  }, [authLoading, user, buscarCota]);

  const total = cota ? cota.limite + cota.extra_granted : null;
  const restantes = cota?.restantes ?? null;
  const bloqueado = restantes != null && restantes <= 0;
  const quaseNoLimite = restantes != null && restantes > 0 && restantes <= 2;

  const abrir = useCallback(
    (destino: "/passageiro/mobilidade/automovel" | "/passageiro/mobilidade/moto") => {
      if (bloqueado) {
        setModalLimite(true);
        return;
      }
      navigate({ to: destino, search: {} });
    },
    [bloqueado, navigate],
  );

  async function enviarPedido() {
    setEnviando(true);
    try {
      await pedirLiberacao({ data: { motivo } });
      toast.success("Pedido enviado ao gestor. Você será avisado após a análise.");
      setModalLimite(false);
      setMotivo("");
    } catch {
      toast.error("Não foi possível enviar o pedido agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-grouped pb-24 font-sans text-foreground">
      <PassageiroHeader backTo="/passageiro/home" title="Mobilidade Urbana" />

      <main className="mx-auto max-w-lg p-6 pt-6">
        {cota && total != null && (
          <div className="mb-4 rounded-3xl bg-card p-4 shadow-sm animate-apple-rise">
            <p className="text-sm text-muted-foreground">Chamadas disponíveis este mês</p>
            <p className="text-2xl font-bold">
              {restantes} <span className="text-base font-semibold text-muted-foreground">de {total}</span>
            </p>
          </div>
        )}

        {quaseNoLimite && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#F2C94C] bg-[#FFF8E1] p-4 text-[#7A5B00]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm font-semibold">Você está próximo do limite mensal.</p>
          </div>
        )}

        {bloqueado && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#F0B4B4] bg-[#FDEEEE] p-4 text-[#8A2B2B]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm font-semibold">
              Você atingiu o limite mensal de chamadas. Solicite liberação ao gestor.
            </p>
          </div>
        )}

        <p className="mb-4 text-muted-foreground animate-apple-rise">
          Deslocamento de servidores — escolha a modalidade do seu transporte.
        </p>

        <AvisoMobilidadeBanner />

        <div className="grid gap-4">

          <button
            aria-label="Solicitar automóvel"
            disabled={bloqueado}
            onClick={() => abrir("/passageiro/mobilidade/automovel")}
            className="group flex w-full items-center gap-4 rounded-3xl bg-card p-6 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 animate-apple-rise stagger-1"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Car size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">Solicitar Automóvel</h2>
              <p className="text-sm text-muted-foreground">Carro sob demanda para deslocamentos institucionais.</p>
            </div>
          </button>

          <button
            aria-label="Solicitar moto táxi"
            disabled={bloqueado}
            onClick={() => abrir("/passageiro/mobilidade/moto")}
            className="group flex w-full items-center gap-4 rounded-3xl bg-card p-6 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 animate-apple-rise stagger-2"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Bike size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">Solicitar Moto Táxi</h2>
              <p className="text-sm text-muted-foreground">Deslocamento rápido para pequenos percursos urbanos.</p>
            </div>
          </button>
        </div>

        {bloqueado && (
          <button
            onClick={() => setModalLimite(true)}
            className="mt-6 w-full rounded-2xl bg-[#3DB54A] py-4 font-bold text-white"
          >
            Solicitar liberação
          </button>
        )}
      </main>

      {modalLimite && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 animate-apple-rise">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">Limite mensal atingido</h2>
              <button
                aria-label="Fechar"
                onClick={() => setModalLimite(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F7]"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-[#6B6B6B]">
              Você atingiu o limite mensal de {total ?? 0} chamadas de mobilidade urbana. Para solicitar
              liberação extra, entre em contato com o gestor.
            </p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Motivo (opcional)"
              className="mt-4 w-full rounded-2xl bg-[#F5F5F7] p-4 text-sm outline-none"
            />
            <button
              disabled={enviando}
              onClick={enviarPedido}
              className="mt-4 w-full rounded-2xl bg-[#3DB54A] py-4 font-bold text-white disabled:opacity-50"
            >
              {enviando ? "Enviando…" : "Solicitar liberação"}
            </button>
          </div>
        </div>
      )}
      <PassageiroTabBar />
    </div>
  );
}
