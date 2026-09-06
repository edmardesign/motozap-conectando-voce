import { createFileRoute } from "@tanstack/react-router";
import { MobilidadeUber } from "@/components/mobilidade-uber";

export const Route = createFileRoute("/passageiro/mobilidade/moto")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Solicitar Moto Táxi — Intergo Logística" },
      { name: "description", content: "Peça uma moto táxi: origem automática, destino e estimativa de preço." },
      { property: "og:title", content: "Solicitar Moto Táxi — Intergo Logística" },
      { property: "og:description", content: "Peça uma moto táxi: origem automática, destino e estimativa de preço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <MobilidadeUber modalidade="moto_taxi" />,
});
