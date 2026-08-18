import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import wordmarkAsset from "@/assets/intergo-wordmark.png.asset.json";

export const Route = createFileRoute("/cadastro/passageiro")({
  head: () => ({
    meta: [
      { title: "Cadastro de Servidor — Intergo Logística" },
      { name: "description", content: "Crie sua conta de servidor no Intergo Logística." },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="mb-8 animate-apple-fade">
        <img src={wordmarkAsset.url} alt="Intergo Logística" className="h-8 w-auto" />
      </div>
      <AuthForm
        role="passageiro"
        title="Cadastro de Servidor"
        redirectTo="/passageiro/home"
        formMode="signup"
      />
    </div>
  ),
});