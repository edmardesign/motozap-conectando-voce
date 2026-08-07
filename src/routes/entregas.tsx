import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/entregas")({
  beforeLoad: () => {
    throw redirect({ to: "/parceiros" });
  },
});
