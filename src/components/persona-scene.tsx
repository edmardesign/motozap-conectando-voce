// Cena animada por persona — CSS puro, leve, respeita prefers-reduced-motion.
// Cada cena reutiliza o ícone da versão + elementos secundários que representam
// o fluxo (passageiro pedindo corrida, moto chegando, empresa acionando entrega, etc.).
import type { CSSProperties } from "react";
import { Bike, MapPin, Package, Building2, User, BellRing, LayoutGrid, Users } from "lucide-react";

export type PersonaKey = "passageiro" | "mototaxi" | "entregas" | "administrador";

interface Props {
  persona: PersonaKey;
  iconUrl: string;
  accent: string; // hex/rgb
}

export function PersonaScene({ persona, iconUrl, accent }: Props) {
  return (
    <div
      className="relative w-full max-w-[320px] aspect-square mx-auto pointer-events-none select-none"
      style={{ "--accent": accent } as CSSProperties}
      aria-hidden="true"
    >
      {/* halos concêntricos */}
      <span className="absolute inset-0 rounded-full opacity-30 animate-halo" style={{ background: `radial-gradient(circle, ${accent}55 0%, transparent 60%)` }} />
      <span className="absolute inset-6 rounded-full border-2 opacity-40 animate-ring-1" style={{ borderColor: accent }} />
      <span className="absolute inset-12 rounded-full border-2 opacity-60 animate-ring-2" style={{ borderColor: accent }} />

      {/* ícone central */}
      <img
        src={iconUrl}
        alt=""
        className="absolute inset-0 m-auto w-32 h-32 rounded-3xl animate-float"
        style={{ filter: `drop-shadow(0 0 32px ${accent}aa)` }}
      />

      {/* orbitadores por persona */}
      {persona === "passageiro" && (
        <>
          <Orbit style={{ top: "6%", left: "50%" }} delay="0s"><MapPin className="w-6 h-6" style={{ color: accent }} /></Orbit>
          <Orbit style={{ top: "50%", right: "4%" }} delay="0.6s"><Bike className="w-7 h-7" style={{ color: accent }} /></Orbit>
          <Orbit style={{ bottom: "6%", left: "50%" }} delay="1.2s"><User className="w-6 h-6" style={{ color: accent }} /></Orbit>
        </>
      )}
      {persona === "mototaxi" && (
        <>
          <Orbit style={{ top: "8%", left: "10%" }} delay="0s"><BellRing className="w-6 h-6" style={{ color: accent }} /></Orbit>
          <Orbit style={{ top: "50%", right: "4%" }} delay="0.5s"><MapPin className="w-6 h-6" style={{ color: accent }} /></Orbit>
          <Orbit style={{ bottom: "8%", left: "12%" }} delay="1s"><Bike className="w-7 h-7" style={{ color: accent }} /></Orbit>
        </>
      )}
      {persona === "entregas" && (
        <>
          <Orbit style={{ top: "6%", left: "14%" }} delay="0s"><Building2 className="w-6 h-6" style={{ color: accent }} /></Orbit>
          <Orbit style={{ top: "50%", right: "4%" }} delay="0.5s"><Package className="w-7 h-7" style={{ color: accent }} /></Orbit>
          <Orbit style={{ bottom: "6%", left: "50%" }} delay="1s"><MapPin className="w-6 h-6" style={{ color: accent }} /></Orbit>
        </>
      )}
      {persona === "administrador" && (
        <>
          <Orbit style={{ top: "6%", left: "18%" }} delay="0s"><LayoutGrid className="w-6 h-6" style={{ color: accent }} /></Orbit>
          <Orbit style={{ top: "50%", right: "4%" }} delay="0.5s"><Users className="w-7 h-7" style={{ color: accent }} /></Orbit>
          <Orbit style={{ bottom: "6%", right: "18%" }} delay="1s"><MapPin className="w-6 h-6" style={{ color: accent }} /></Orbit>
        </>
      )}
    </div>
  );
}

function Orbit({ children, style, delay }: { children: React.ReactNode; style: CSSProperties; delay: string }) {
  return (
    <span
      className="absolute w-11 h-11 -ml-[22px] -mt-[22px] rounded-2xl flex items-center justify-center animate-orbit"
      style={{ ...style, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.08)", animationDelay: delay }}
    >
      {children}
    </span>
  );
}
