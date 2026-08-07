import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/empresa/home")({
  beforeLoad: () => {
    throw redirect({ to: "/parceiros/painel" });
  },
});
