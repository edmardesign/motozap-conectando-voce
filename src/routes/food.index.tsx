import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/food/")({
  beforeLoad: () => {
    throw redirect({ to: "/parceiros" });
  },
});
