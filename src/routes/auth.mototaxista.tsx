import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/auth/mototaxista")({
  head: () => ({
    meta: [
      { title: "Entrar como Mototaxista — Bora Zé!" },
      { name: "description", content: "Acesse sua conta de mototaxista do Bora Zé! para receber corridas." },
    ],
  }),
  component: () => (
    <AuthForm role="mototaxista" title="Sou Mototaxista" redirectTo="/mototaxista/home" />
  ),
});
