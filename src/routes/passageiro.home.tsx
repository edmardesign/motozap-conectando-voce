import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, CalendarClock, Car, Bike, FileText, Stethoscope, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import wordmarkAsset from "@/assets/intergo-wordmark.png.asset.json";
import { AvisoMobilidadeTexto } from "@/components/aviso-mobilidade";
import { PassageiroTabBar } from "@/components/passageiro-tab-bar";
import { minhaCotaMobilidade, type CotaMensal } from "@/lib/cotas.functions";

export const Route = createFileRoute("/passageiro/home")({
  component: IntergoHubPage,
  ssr: false,
});

type AbaHome = "mobilidade" | "logistica";

export function IntergoHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const buscarCota = useServerFn(minhaCotaMobilidade);

  const [userName, setUserName] = useState("Servidor");
  const [aba, setAba] = useState<AbaHome>("mobilidade");
  const [cota, setCota] = useState<CotaMensal | null>(null);

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
  const iniciais = userName.slice(0, 2).toUpperCase();

  const atalhos = [
    { label: "Automóvel", Icon: Car, onClick: () => navigate({ to: "/passageiro/mobilidade/automovel" }) },
    { label: "Moto Táxi", Icon: Bike, onClick: () => navigate({ to: "/passageiro/mobilidade/moto" }) },
    { label: "Enviar Documento", Icon: FileText, onClick: () => navigate({ to: "/hub" }) },
    { label: "Exame", Icon: Stethoscope, onClick: () => navigate({ to: "/hub" }) },
  ];

  const sugestoesLogistica = [
    "Levar exame ao PSF",
    "Buscar documento Prefeitura",
    "Entregar medicamento UPA",
  ];

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md">
        <div className="mx-auto grid h-14 max-w-lg grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5">
          <img src={wordmarkAsset.url} alt="Intergo Logística" className="h-5 w-auto justify-self-start" />
          <button
            type="button"
            onClick={() => navigate({ to: "/passageiro/perfil" })}
            aria-label="Perfil do servidor"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill-tertiary text-xs font-semibold"
          >
            {iniciais}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5">
        {/* Saudação como barra de busca */}
        <button
          type="button"
          onClick={() => navigate({ to: "/passageiro/mobilidade" })}
          className="flex h-14 w-full items-center gap-3 rounded-full bg-fill-tertiary pl-5 pr-2 text-left"
        >
          <Search size={20} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-[17px] font-medium">Olá, {userName}.</span>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-2 text-[13px] font-medium">
            <CalendarClock size={16} strokeWidth={1.8} />
            Mais tarde
          </span>
        </button>

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
          <section className="pt-6">
            <button
              type="button"
              onClick={() => navigate({ to: "/passageiro/mobilidade" })}
              className="mb-4 flex items-center gap-1 text-[17px] font-semibold"
            >
              Para você <span aria-hidden>›</span>
            </button>

            <div className="grid grid-cols-4 gap-3">
              {atalhos.map(({ label, Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-fill-secondary">
                    <Icon size={40} strokeWidth={1.4} />
                  </span>
                  <span className="text-[12px] font-medium leading-tight">{label}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-3xl bg-primary p-5 text-primary-foreground">
              <p className="text-[15px] font-semibold opacity-90">Sua cota mensal</p>
              <p className="mt-1 text-2xl font-bold">
                {cota ? `${cota.restantes} de ${total}` : "— de —"} chamadas este mês
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/passageiro/perfil" })}
                className="mt-4 rounded-full bg-card px-5 py-2.5 text-[15px] font-semibold text-foreground"
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

        <AvisoMobilidadeTexto className="mt-8" />
      </main>

      <PassageiroTabBar />
    </div>
  );
}
