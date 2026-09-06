import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Car, Bike, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/passageiro/mobilidade/")({
  head: () => ({
    meta: [
      { title: "Mobilidade Urbana — Intergo Logística" },
      { name: "description", content: "Solicite automóvel ou moto táxi para deslocamento de servidores." },
      { property: "og:title", content: "Mobilidade Urbana — Intergo Logística" },
      { property: "og:description", content: "Solicite automóvel ou moto táxi para deslocamento de servidores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MobilidadeEscolhaPage,
});

function MobilidadeEscolhaPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans text-[#111111]">
      <header className="sticky top-0 z-50 w-full border-b border-[#E8E8E8] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center px-6">
          <button
            aria-label="Voltar"
            onClick={() => navigate({ to: "/passageiro/home" })}
            className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F7] text-[#6B6B6B]"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Mobilidade Urbana</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-6 pt-8">
        <p className="mb-6 text-[#6B6B6B] animate-apple-rise">
          Deslocamento de servidores — escolha a modalidade do seu transporte.
        </p>

        <div className="grid gap-4">
          <button
            aria-label="Solicitar automóvel"
            onClick={() => navigate({ to: "/passageiro/mobilidade/automovel" })}
            className="group flex w-full items-center gap-4 rounded-[24px] bg-white p-6 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] animate-apple-rise stagger-1"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#3DB54A] text-white">
              <Car size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">Solicitar Automóvel</h2>
              <p className="text-sm text-[#6B6B6B]">Carro sob demanda para deslocamentos institucionais.</p>
            </div>
          </button>

          <button
            aria-label="Solicitar moto táxi"
            onClick={() => navigate({ to: "/passageiro/mobilidade/moto" })}
            className="group flex w-full items-center gap-4 rounded-[24px] bg-white p-6 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] animate-apple-rise stagger-2"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#3DB54A] text-white">
              <Bike size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">Solicitar Moto Táxi</h2>
              <p className="text-sm text-[#6B6B6B]">Deslocamento rápido para pequenos percursos urbanos.</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
