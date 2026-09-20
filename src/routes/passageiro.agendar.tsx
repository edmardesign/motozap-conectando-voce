import { createFileRoute } from "@tanstack/react-router";
import { AgendamentoSheet } from "@/components/agendamento-sheet";
import { PassageiroHeader } from "@/components/passageiro-header";
import { PassageiroTabBar } from "@/components/passageiro-tab-bar";

export const Route = createFileRoute("/passageiro/agendar")({
  head: () => ({
    meta: [
      { title: "Agendar solicitação — Intergo Logística" },
      { name: "description", content: "Agende mobilidade urbana ou um envio institucional." },
      { property: "og:title", content: "Agendar solicitação — Intergo Logística" },
      { property: "og:description", content: "Agende mobilidade urbana ou um envio institucional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendarPage,
});

function AgendarPage() {
  return (
    <main className="min-h-screen bg-grouped pb-24 text-foreground">
      <PassageiroHeader backTo="/passageiro/home" title="Agendamento" />
      <div className="mx-auto max-w-lg px-5 pt-5">
        <AgendamentoSheet embedded />
      </div>
      <PassageiroTabBar />
    </main>
  );
}