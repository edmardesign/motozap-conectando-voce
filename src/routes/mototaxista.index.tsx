// Rota legada /mototaxista → landing pública canônica /mototaxi.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mototaxista/")({
  beforeLoad: () => {
    throw redirect({ to: "/mototaxi" });
  },
});
