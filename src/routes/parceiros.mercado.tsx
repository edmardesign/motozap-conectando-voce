import { createFileRoute } from "@tanstack/react-router";
import { PainelMercado } from "./estabelecimento.mercado";

export const Route = createFileRoute("/parceiros/mercado")({
  head: () => ({
    meta: [
      { title: "Painel Mercado — Parceiros Bora Zé!" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PainelMercado,
});
