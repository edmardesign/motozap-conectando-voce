import { useEffect } from "react";
import { IntergoLogoMotion } from "./intergo-logo-motion";

/**
 * IntroAnimation — abertura da marca InterGO (estética Apple).
 * Mantém a mesma API pública usada nas telas existentes.
 */
export function BoraZeIntroAnimation({
  storageKey = "intergo.introSeen",
  onDone,
}: {
  storageKey?: string;
  onDone?: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        /* storage indisponível — segue sem persistir */
      }
      onDone?.();
    }, 1600);
    return () => clearTimeout(t);
  }, [storageKey, onDone]);

  return (
    <div className="relative flex w-full items-center justify-center" style={{ minHeight: 240 }}>
      <IntergoLogoMotion size={200} />
    </div>
  );
}
