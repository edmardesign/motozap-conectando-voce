import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import iconPax from "@/assets/btn-passageiro.png.asset.json";
import wordmarkAsset from "@/assets/intergo-wordmark.png.asset.json";

export const Route = createFileRoute("/auth/passageiro")({
  head: () => ({
    meta: [
      { title: "Entrar — Intergo Logística" },
      { name: "description", content: "Acesse sua conta de servidor no Intergo Logística." },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="mb-10 animate-apple-fade">
        <img src={wordmarkAsset.url} alt="Intergo Logística" className="h-8 w-auto" />
      </div>
      <AuthForm
        title="Sou Servidor"
        subtitle="Identifique-se para solicitar transporte institucional"
        iconUrl={iconPax.url}
        accent="#3DB54A"
        type="passageiro"
      />
    </div>
  ),
});