import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PassageiroHeader } from "@/components/passageiro-header";
import { PassageiroTabBar } from "@/components/passageiro-tab-bar";

export const Route = createFileRoute("/passageiro/frota")({
  component: FrotaPage,
  ssr: false,
  head: () => ({ meta: [
    { title: "Gestão de Frota — Intergo Logística" },
    { name: "description", content: "Gestão e monitoramento da frota institucional." },
    { property: "og:title", content: "Gestão de Frota — Intergo Logística" },
    { property: "og:description", content: "Gestão e monitoramento da frota institucional." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function FrotaPage() {
  return (
    <div className="min-h-screen bg-grouped pb-24 font-sans text-foreground">
      <PassageiroHeader backTo="/passageiro/home" title="Frota" />

      <main className="mx-auto max-w-lg px-6 pt-8 text-center">
        <div className="mb-8 flex flex-col items-center animate-apple-rise">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Frota</h1>
          <p className="mt-2 text-muted-foreground">Módulo de gestão e monitoramento em desenvolvimento.</p>
        </div>
      </main>
      <PassageiroTabBar />
    </div>
  );
}
