import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/auth/passageiro")({
  head: () => ({
    meta: [
      { title: "Entrar como Passageiro — InterGO" },
      { name: "description", content: "Acesse sua conta de passageiro do InterGO para pedir uma corrida." },
    ],
  }),
  component: () => (
    <AuthForm
      role="passageiro"
      title="Sou Passageiro"
      redirectTo="/passageiro/home"
      formMode="login"
      signupRedirectTo="/cadastro/passageiro"
    />
  ),
});
