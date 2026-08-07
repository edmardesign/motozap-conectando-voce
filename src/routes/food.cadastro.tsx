import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/food/cadastro")({
  beforeLoad: () => {
    throw redirect({ to: "/parceiros/cadastro" });
  },
});
