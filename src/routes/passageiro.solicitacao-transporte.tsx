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

      <main className="mx-auto max-w-lg px-6 pt-8 text-center">
        <div className="mb-8 flex flex-col items-center animate-apple-rise">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[30px] bg-[#3DB54A] text-white">
            <Truck size={40} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Solicitação de Transporte</h1>
          <p className="mt-2 text-[#6B6B6B]">Logística de materiais e documentos em desenvolvimento.</p>
        </div>
      </main>
    </div>
  );
}
