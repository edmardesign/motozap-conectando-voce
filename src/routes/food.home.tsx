import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/food/home")({
  beforeLoad: () => {
    throw redirect({ to: "/parceiros/painel" });
  },
});
