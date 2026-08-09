import { useEffect, useState } from "react";
import markAsset from "@/assets/intergo-mark.png.asset.json";
import wordmarkAsset from "@/assets/intergo-wordmark.png.asset.json";

type Phase = "icon" | "logo" | "done";

/**
 * IntroAnimation — abertura da marca InterGO no estilo Apple.
 * Sequência: ícone (capacete) entra com blur + spring → some →
 * logomarca horizontal entra e permanece fixa.
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

    const t1 = setTimeout(() => setPhase("logo"), 1200);
    const t2 = setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        /* storage indisponível — segue sem persistir */
      }
      onDone?.();
    }, 2200);
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
            "radial-gradient(circle, rgba(61,181,74,0.20) 0%, rgba(61,181,74,0) 70%)",
          filter: "blur(38px)",
        }}
      />

      {/* Ícone (capacete) — some ao final */}
      <img
        src={markAsset.url}
        alt="InterGO"
        className={showLogo ? "absolute h-auto" : "animate-apple-pop absolute h-auto"}
        style={{
          width: "min(34vw, 132px)",
          opacity: showLogo ? 0 : 1,
          visibility: showLogo ? "hidden" : "visible",
          transform: showLogo ? "scale(1.18)" : "scale(1)",
          filter: showLogo ? "blur(10px)" : "blur(0px)",
          transition:
            "opacity 560ms var(--ease-apple), transform 560ms var(--ease-apple), filter 560ms var(--ease-apple)",
        }}
      />

      {/* Logomarca horizontal — estado final permanente */}
      <img
        src={wordmarkAsset.url}
        alt="InterGO"
        className="absolute h-auto"
        style={{
          width: "min(74vw, 288px)",
          opacity: showLogo ? 1 : 0,
          transform: showLogo ? "scale(1)" : "scale(0.9)",
          filter: showLogo ? "blur(0px)" : "blur(12px)",
          transition:
            "opacity 720ms var(--ease-apple-out), transform 900ms var(--ease-spring), filter 720ms var(--ease-apple-out)",
        }}
      />
    </div>
  );
}
