import { useEffect, useState } from "react";
import iconMz from "@/assets/intergo-icon-green.png.asset.json";
import logoMz from "@/assets/intergo-logo-white.png.asset.json";

type Phase = "icon" | "logo" | "done";

/**
 * IntroAnimation — abertura da marca InterGO no estilo Apple.
 * Sequência: ícone verde (blur-in + spring) → logomarca completa (crossfade suave).
 * O estado final é estático: a logomarca permanece visível para sempre.
 * Respeita prefers-reduced-motion → salta direto para o estado final.
 */
export function BoraZeIntroAnimation({
  storageKey = "intergo.introSeen",
  onDone,
}: {
  storageKey?: string;
  onDone?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("icon");

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const seen =
      typeof window !== "undefined" &&
      sessionStorage.getItem(storageKey) === "1";

    if (reduce || seen) {
      setPhase("done");
      onDone?.();
      return;
    }

    const t1 = setTimeout(() => setPhase("logo"), 1100);
    const t2 = setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        /* storage indisponível — segue sem persistir */
      }
      onDone?.();
    }, 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [storageKey, onDone]);

  const showLogo = phase !== "icon";

  return (
    <div className="relative flex w-full items-center justify-center" style={{ minHeight: 240 }}>
      {/* Halo verde institucional, bem sutil (estilo Apple) */}
      <div
        aria-hidden
        className="animate-apple-glow pointer-events-none absolute"
        style={{
          width: "min(88vw, 380px)",
          height: "min(88vw, 380px)",
          borderRadius: "9999px",
          background:
            "radial-gradient(circle, rgba(61,181,74,0.22) 0%, rgba(61,181,74,0) 70%)",
          filter: "blur(38px)",
        }}
      />

      {/* Ícone */}
      <img
        src={iconMz.url}
        alt="InterGO"
        className={showLogo ? "absolute h-auto" : "animate-apple-pop absolute h-auto"}
        style={{
          width: "min(40vw, 148px)",
          opacity: showLogo ? 0 : 1,
          visibility: showLogo ? "hidden" : "visible",
          transform: showLogo ? "scale(1.18)" : "scale(1)",
          filter: showLogo ? "blur(10px)" : "blur(0px)",
          transition:
            "opacity 620ms var(--ease-apple), transform 620ms var(--ease-apple), filter 620ms var(--ease-apple)",
        }}
      />

      {/* Logomarca completa — estado final permanente */}
      <img
        src={logoMz.url}
        alt="InterGO"
        className="absolute h-auto"
        style={{
          width: "min(78vw, 300px)",
          opacity: showLogo ? 1 : 0,
          transform: showLogo ? "scale(1)" : "scale(0.92)",
          filter: showLogo ? "brightness(0) blur(0px)" : "brightness(0) blur(12px)",
          transition:
            "opacity 720ms var(--ease-apple-out), transform 900ms var(--ease-spring), filter 720ms var(--ease-apple-out)",
        }}
      />
    </div>
  );
}
