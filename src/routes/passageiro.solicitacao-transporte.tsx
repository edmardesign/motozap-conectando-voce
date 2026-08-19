import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  ChevronLeft,
  Truck
} from "lucide-react";
import wordmarkAsset from "@/assets/intergo-wordmark.png.asset.json";

export const Route = createFileRoute("/passageiro/solicitacao-transporte")({
  component: SolicitacaoTransportePage,
  ssr: false,
});

function SolicitacaoTransportePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-24 font-sans text-[#111111]">
      <header className="sticky top-0 z-50 w-full border-b border-[#E8E8E8] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center px-6">
          <button 
            onClick={() => navigate({ to: "/passageiro/home" })}
            className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F7] text-[#111111] hover:bg-[#E8E8E8]"
          >
            <ChevronLeft size={20} />
          </button>
          <img src={wordmarkAsset.url} alt="Intergo Logística" className="h-6 w-auto" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 pt-8">
        <div className="mb-8 flex flex-col items-center animate-apple-rise text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[30px] bg-[#3DB54A] text-white">
            <Truck size={40} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Solicitação de Transporte</h1>
          <p className="mt-2 text-[#6B6B6B]">Logística institucional de materiais e documentos.</p>
        </div>

        <div className="grid gap-4">
          <button 
            onClick={() => navigate({ to: "/hub", search: { tipo: "documentos" } as any })}
            className="group flex w-full items-center gap-4 rounded-[24px] bg-white p-6 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] animate-apple-rise stagger-1"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#3DB54A] text-white">
              <span className="text-2xl">📄</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#111111]">Documentos</h3>
              <p className="text-sm text-[#6B6B6B]">Envio e coleta de documentos oficiais.</p>
            </div>
          </button>

          <button 
            onClick={() => navigate({ to: "/hub", search: { tipo: "exames" } as any })}
            className="group flex w-full items-center gap-4 rounded-[24px] bg-white p-6 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] animate-apple-rise stagger-2"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#3DB54A] text-white">
              <span className="text-2xl">🩺</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#111111]">Exames</h3>
              <p className="text-sm text-[#6B6B6B]">Logística de exames e laudos médicos.</p>
            </div>
          </button>

          <button 
            onClick={() => navigate({ to: "/hub", search: { tipo: "medicamentos" } as any })}
            className="group flex w-full items-center gap-4 rounded-[24px] bg-white p-6 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] animate-apple-rise stagger-3"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#3DB54A] text-white">
              <span className="text-2xl">💊</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#111111]">Medicamentos</h3>
              <p className="text-sm text-[#6B6B6B]">Transporte de medicamentos e insumos.</p>
            </div>
          </button>

          <button 
            onClick={() => navigate({ to: "/hub", search: { tipo: "encomendas" } as any })}
            className="group flex w-full items-center gap-4 rounded-[24px] bg-white p-6 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] animate-apple-rise stagger-4"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#3DB54A] text-white">
              <span className="text-2xl">📦</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#111111]">Encomendas</h3>
              <p className="text-sm text-[#6B6B6B]">Volumes e encomendas diversas.</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
