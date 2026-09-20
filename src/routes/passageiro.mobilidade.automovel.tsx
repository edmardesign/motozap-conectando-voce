import { createFileRoute } from "@tanstack/react-router";
import { MobilidadeUber } from "@/components/mobilidade-uber";

export const Route = createFileRoute("/passageiro/mobilidade/automovel")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    agendar: search.agendar === "1" ? "1" : undefined,
    data: typeof search.data === "string" ? search.data : undefined,
    hora: typeof search.hora === "string" ? search.hora : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Solicitar Automóvel — Intergo Logística" },
      { name: "description", content: "Peça um carro sob demanda: origem automática, destino e estimativa de preço." },
      { property: "og:title", content: "Solicitar Automóvel — Intergo Logística" },
      { property: "og:description", content: "Peça um carro sob demanda: origem automática, destino e estimativa de preço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AutomovelPage,
});

function AutomovelPage() {
  const search = Route.useSearch();
  return <MobilidadeUber modalidade="automovel" agendamento={search} />;
}
