import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  Car, 
  Bike, 
  ChevronLeft,
  Users
} from "lucide-react";
import wordmarkAsset from "@/assets/intergo-wordmark.png.asset.json";

export const Route = createFileRoute("/passageiro/transporte-servidores")({
  component: TransporteServidoresPage,
  ssr: false,
});

function TransporteServidoresPage() {
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
        <div className="mb-8 animate-apple-rise">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3DB54A] text-white">
            <Users size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Transporte de Servidores</h1>
          <p className="text-[#6B6B6B]">Escolha como deseja se deslocar hoje.</p>
        </div>

        <div className="grid gap-4 animate-apple-rise stagger-1">
          <OptionCard 
            title="Solicitar Automóvel"
            description="Carro sob demanda para deslocamento oficial confortável."
            icon={Car}
            onClick={() => navigate({ to: "/passageiro/home" })}
          />
          <OptionCard 
            title="Solicitar Moto Táxi"
            description="Deslocamento rápido e eficiente para urgências."
            icon={Bike}
            onClick={() => navigate({ to: "/passageiro/home" })}
          />
        </div>
      </main>
    </div>
  );
}

function OptionCard({ title, description, icon: Icon, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="group flex w-full flex-col gap-4 rounded-[24px] bg-white p-6 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F5F7] text-[#3DB54A] transition-colors group-hover:bg-[#3DB54A] group-hover:text-white">
        <Icon size={32} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-[#111111]">{title}</h3>
        <p className="text-sm text-[#6B6B6B]">{description}</p>
      </div>
    </button>
  );
}
