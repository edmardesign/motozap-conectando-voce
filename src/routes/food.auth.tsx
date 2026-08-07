import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/food/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/parceiros/auth" });
  },
});
