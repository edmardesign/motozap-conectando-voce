import { useEffect, useState } from "react";
import iconMz from "@/assets/intergo-icon-green.png.asset.json";
import textMz from "@/assets/intergo-logo-white.png.asset.json";
import logoMz from "@/assets/intergo-logo-white.png.asset.json";

type Phase = "icon" | "text" | "done";

/**
 * BoraZeIntroAnimation
 * Reutiliza exatamente a sequência da Home (splash):
 *   1) ícone   →  2) texto  →  3) logomarca completa (estado final estático).
 * A logomarca completa NUNCA desaparece após o fim da sequência.
 * Respeita prefers-reduced-motion → salta direto para o estado final.
 * Não faz loop, não volta ao símbolo, não posiciona a logo no canto.
 */
export function BoraZeIntroAnimation({
  storageKey = "boraze.introSeen",
  onDone,
}: {
  storageKey?: string;
  onDone?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("icon");

  useEffect(() => {
    // Fallback total: reduced-motion ou storage já viu → estado final imediato.
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

    const t1 = setTimeout(() => setPhase("text"), 1300);
    const t2 = setTimeout(() => {
      setPhase("done");
      try { sessionStorage.setItem(storageKey, "1"); } catch {}
      onDone?.();
    }, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [storageKey, onDone]);

  // Estado final estático — logomarca completa centralizada, sempre visível.
  if (phase === "done") {
    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 240,
        }}
      >
        <img
          src={logoMz.url}
          alt="InterGO"
          className="animate-scale-in"
          style={{
            width: "min(85vw, 320px)",
            height: "auto",
            filter: "drop-shadow(0 0 24px rgba(61, 181, 74,0.35))",
          }}
        />
      </div>
    );
  }

  // Sequência animada — ícone e texto se alternam, ambos centralizados.
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: 240,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <img
        src={iconMz.url}
        alt="InterGO"
        style={{
          position: "absolute",
          width: "min(50vw, 200px)",
          height: "auto",
          opacity: phase === "icon" ? 1 : 0,
          transition: "opacity 500ms ease-in-out",
          filter: "drop-shadow(0 0 32px rgba(61, 181, 74,0.5))",
        }}
      />
      <img
        src={textMz.url}
        alt="InterGO"
        style={{
          position: "absolute",
          width: "min(80vw, 320px)",
          height: "auto",
          opacity: phase === "text" ? 1 : 0,
          transform: phase === "text" ? "scale(1)" : "scale(0.92)",
          transition: "opacity 500ms ease-out, transform 500ms ease-out",
          filter: "drop-shadow(0 0 24px rgba(61, 181, 74,0.4))",
        }}
      />
    </div>
  );
}
