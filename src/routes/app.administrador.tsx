// start_url do PWA Administrador. Login unificado (principal, subadmin, embaixador);
// o nível é decidido no servidor após autenticação (ver /adm e _admGate).
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/administrador")({
  beforeLoad: () => {
    throw redirect({ to: "/adm" });
  },
});
