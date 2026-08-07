import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/empresa/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/parceiros/auth" });
  },
});
