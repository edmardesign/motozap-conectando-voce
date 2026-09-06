import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  Truck, 
  Users, 
  FileBarChart, 
  MapPin, 
  ChevronRight,
  LogOut,
  Building2,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import wordmarkAsset from "@/assets/intergo-wordmark.png.asset.json";

export const Route = createFileRoute("/passageiro/home")({
  component: IntergoHubPage,
  ssr: false,
});

export function IntergoHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Servidor");

  useEffect(() => {
    if (user?.user_metadata?.nome) {
      setUserName(user.user_metadata.nome.split(" ")[0]);
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/splash" });
    toast.success("Até logo!");
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-24 font-sans text-[#111111]">
      {/* Header Fixo */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E8E8E8] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-6">
          <img src={wordmarkAsset.url} alt="Intergo Logística" className="h-6 w-auto" />
          <button 
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F7] text-[#6B6B6B] hover:bg-[#E8E8E8]"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 pt-8">
        {/* Saudação */}
        <div className="mb-8 animate-apple-rise">
          <h1 className="text-2xl font-bold tracking-tight">Olá, {userName}!</h1>
          <p className="text-[#6B6B6B]">O que vamos fazer hoje?</p>
        </div>

        {/* Bloco: Serviços Institucionais */}
        <section className="mb-10 animate-apple-rise stagger-2">
          <div className="mb-4 flex items-center gap-2 px-1">
            <Building2 size={18} className="text-[#3DB54A]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#6B6B6B]">Serviços Institucionais</h2>
          </div>
          
          <div className="grid gap-3">
            <HubCard 
              title="Mobilidade Urbana"
              description="Deslocamento de servidores — carro ou moto táxi"
              icon={Users}
              color="bg-[#3DB54A]"
              onClick={() => navigate({ to: "/passageiro/mobilidade" })}
            />
            <HubCard 
              title="Logística de Envios"
              description="Documentos, exames, medicamentos e encomendas"
              icon={Truck}
              color="bg-[#3DB54A]"
              onClick={() => navigate({ to: "/passageiro/solicitacao-transporte" })}
            />
            <div className="grid grid-cols-2 gap-3">
              <HubSmallCard 
                title="Frota"
                icon={ShieldCheck}
                onClick={() => navigate({ to: "/passageiro/frota" })}
              />
              <HubSmallCard 
                title="Relatórios"
                icon={FileBarChart}
                onClick={() => navigate({ to: "/passageiro/relatorios" })}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Nav de navegação rápida mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E8E8E8] bg-white px-6 pb-safe-area pt-2 flex items-center justify-between shadow-[0_-1px_12px_rgba(0,0,0,0.05)]">
        <NavButton 
          icon={Smartphone} 
          label="Início" 
          active 
          onClick={() => navigate({ to: "/passageiro/home" })} 
        />
        <NavButton 
          icon={MapPin} 
          label="Serviços" 
          onClick={() => navigate({ to: "/passageiro/home" })} 
        />
        <NavButton 
          icon={FileBarChart} 
          label="Viagens" 
          onClick={() => navigate({ to: "/passageiro/corridas", search: {} as any })} 
        />
        <NavButton 
          icon={Users} 
          label="Perfil" 
          onClick={() => navigate({ to: "/passageiro/perfil" })} 
        />
      </nav>
    </div>
  );
}

function HubCard({ title, description, icon: Icon, color, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-[20px] bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color} text-white`}>
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-[#111111]">{title}</h3>
        <p className="text-xs text-[#6B6B6B]">{description}</p>
      </div>
      <ChevronRight size={20} className="text-[#D9D9D9] transition-transform group-hover:translate-x-1" />
    </button>
  );
}

function HubSmallCard({ title, icon: Icon, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-[20px] bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F5F7] text-[#111111]">
        <Icon size={20} />
      </div>
      <span className="text-xs font-bold text-[#111111]">{title}</span>
    </button>
  );
}

function NavButton({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2 ${active ? 'text-[#3DB54A]' : 'text-[#6B6B6B]'}`}
    >
      <Icon size={22} />
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
    </button>
  );
}
