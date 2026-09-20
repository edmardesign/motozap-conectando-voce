import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileBarChart } from "lucide-react";
import { PassageiroHeader } from "@/components/passageiro-header";
import { PassageiroTabBar } from "@/components/passageiro-tab-bar";

export const Route = createFileRoute("/passageiro/relatorios")({
  component: RelatoriosPage,
  ssr: false,
  head: () => ({ meta: [
    { title: "Relatórios — Intergo Logística" },
    { name: "description", content: "Dados e indicadores da logística institucional." },
    { property: "og:title", content: "Relatórios — Intergo Logística" },
    { property: "og:description", content: "Dados e indicadores da logística institucional." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function RelatoriosPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-grouped pb-24 font-sans text-foreground">
      <PassageiroHeader backTo="/passageiro/home" title="Relatórios" />

      <main className="mx-auto max-w-lg px-6 pt-8 text-center">
        <div className="mb-8 flex flex-col items-center animate-apple-rise">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
            <FileBarChart size={40} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios Institucionais</h1>
          <p className="mt-2 text-muted-foreground">Dados e indicadores de logística em desenvolvimento.</p>
        </div>
      </main>
      <PassageiroTabBar />
    </div>
  );
}
