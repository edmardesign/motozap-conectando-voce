import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, CalendarClock, Car, Bike, FileText, Stethoscope, Check, Gauge } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AvisoMobilidadeTexto } from "@/components/aviso-mobilidade";
import { PassageiroTabBar } from "@/components/passageiro-tab-bar";
import { PassageiroHeader } from "@/components/passageiro-header";
import { AgendamentoSheet } from "@/components/agendamento-sheet";
import { minhaCotaMobilidade, type CotaMensal } from "@/lib/cotas.functions";

export const Route = createFileRoute("/passageiro/home")({
  component: IntergoHubPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Início — Intergo Logística" },
      { name: "description", content: "Mobilidade urbana e logística institucional para servidores." },
      { property: "og:title", content: "Início — Intergo Logística" },
      { property: "og:description", content: "Mobilidade urbana e logística institucional para servidores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type AbaHome = "mobilidade" | "logistica";

export function IntergoHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const buscarCota = useServerFn(minhaCotaMobilidade);

  const [userName, setUserName] = useState("Servidor");
  const [aba, setAba] = useState<AbaHome>("mobilidade");
  const [cota, setCota] = useState<CotaMensal | null>(null);
  const [agendamentoAberto, setAgendamentoAberto] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.nome) {
      setUserName(String(user.user_metadata.nome).split(" ")[0]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      try {
        const c = await buscarCota();
        if (!cancel) setCota(c);
      } catch {
        /* silencioso: a home continua utilizável sem a cota */
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user, buscarCota]);

  const total = cota ? cota.limite + cota.extra_granted : null;
  const atalhos = [
    { label: "Automóvel", Icon: Car, onClick: () => navigate({ to: "/passageiro/mobilidade/automovel", search: {} }) },
    { label: "Moto Táxi", Icon: Bike, onClick: () => navigate({ to: "/passageiro/mobilidade/moto", search: {} }) },
    { label: "Enviar Documento", Icon: FileText, onClick: () => navigate({ to: "/hub" }) },
    { label: "Exame", Icon: Stethoscope, onClick: () => navigate({ to: "/hub" }) },
  ];

  const sugestoesLogistica = [
    "Levar exame ao PSF",
    "Buscar documento Prefeitura",
    "Entregar medicamento UPA",
  ];
  const destinosFrequentes = ["Prefeitura", "PSF Coqueiro", "UPA"];

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <PassageiroHeader name={userName} />

      <main className="mx-auto max-w-lg px-5">
        {/* Saudação como barra de busca */}
        <div className="flex h-14 w-full items-center gap-3 rounded-full bg-fill-tertiary pl-5 pr-2 text-left">
          <Search size={20} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
          <button type="button" onClick={() => navigate({ to: "/passageiro/mobilidade" })} className="min-w-0 flex-1 truncate text-left text-[17px] font-medium">
            Olá, {userName}.
          </button>
          <button type="button" onClick={() => setAgendamentoAberto(true)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-2 text-[13px] font-medium shadow-xs">
            <CalendarClock size={16} strokeWidth={1.8} />
            Mais tarde
          </button>
        </div>

        {/* Abas */}
        <div className="mt-5 flex items-center gap-6 border-b border-border">
          {(
            [
              { id: "mobilidade" as const, label: "Mobilidade" },
              { id: "logistica" as const, label: "Logística" },
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAba(t.id)}
              className={`-mb-px border-b-2 pb-3 text-lg font-semibold transition-colors ${
                aba === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {aba === "mobilidade" ? (
          <section className="pt-7">
            <button
              type="button"
              onClick={() => navigate({ to: "/passageiro/mobilidade" })}
              className="mb-4 flex items-center gap-1 text-[17px] font-semibold"
            >
              Para você <span aria-hidden>›</span>
            </button>

            <div className="grid grid-cols-4 gap-2.5 pb-2">
              {atalhos.map(({ label, Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="flex min-w-0 flex-col items-center gap-2 text-center"
                >
                  <span className="flex aspect-square w-full max-w-20 items-center justify-center rounded-full bg-fill-secondary shadow-xs">
                    <Icon size={36} strokeWidth={1.4} />
                  </span>
                  <span className="text-[12px] font-medium leading-tight">{label}</span>
                </button>
              ))}
            </div>

            <div className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1">
              {destinosFrequentes.map((destino) => (
                <button key={destino} type="button" onClick={() => navigate({ to: "/passageiro/mobilidade" })} className="shrink-0 rounded-full bg-fill-tertiary px-4 py-2.5 text-sm font-medium">
                  {destino}
                </button>
              ))}
            </div>

            <div className="mt-5 flex h-12 items-center gap-2 border-l-[3px] border-primary bg-primary/10 px-3">
              <Gauge size={17} className="shrink-0 text-primary" />
              <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                {cota ? `${cota.restantes} de ${total}` : "— de —"} chamadas este mês
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/passageiro/perfil" })}
                className="shrink-0 text-xs font-semibold text-primary"
              >
                Ver histórico
              </button>
            </div>
          </section>
        ) : (
          <section className="pt-6">
            <div className="rounded-3xl bg-institutional p-6 text-institutional-foreground">
              <h2 className="text-xl font-bold">Envio institucional</h2>
              <ul className="mt-4 space-y-2.5">
                {["Rastreamento tempo real", "Auditoria completa", "Autorização automática"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px]">
                    <Check size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => navigate({ to: "/hub" })}
                className="mt-5 rounded-full bg-card px-5 py-2.5 text-[15px] font-semibold text-foreground"
              >
                Novo envio
              </button>
            </div>

            <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {sugestoesLogistica.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => navigate({ to: "/hub" })}
                  className="shrink-0 whitespace-nowrap rounded-full bg-fill-tertiary px-4 py-2.5 text-[14px] font-medium"
                >
                  {s}
                </button>
              ))}
            </div>
          </section>
        )}

        <AvisoMobilidadeTexto className="mt-7 pb-4" />
      </main>

      <PassageiroTabBar />
      <AgendamentoSheet open={agendamentoAberto} onClose={() => setAgendamentoAberto(false)} />
    </div>
  );
}
