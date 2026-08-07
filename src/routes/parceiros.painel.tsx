import { createFileRoute } from "@tanstack/react-router";
import { Painel } from "./estabelecimento.painel";

export const Route = createFileRoute("/parceiros/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Parceiros Bora Zé!" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Painel,
});
