import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/empresa/cadastro")({
  beforeLoad: () => {
    throw redirect({ to: "/parceiros/cadastro" });
  },
});
