import { useEffect, useState } from "react";
import { IntergoLogoMotion } from "./intergo-logo-motion";

/** Exibida a cada abertura do app (uma vez por carregamento de página). */
let jaExibidaNestaSessaoDePagina = false;

export function IntergoSplash({ duracaoMs = 1700 }: { duracaoMs?: number }) {
  const [visivel, setVisivel] = useState(false);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (jaExibidaNestaSessaoDePagina) return;
    jaExibidaNestaSessaoDePagina = true;
    setVisivel(true);
    const tFade = window.setTimeout(() => setSaindo(true), duracaoMs);
    const tFim = window.setTimeout(() => setVisivel(false), duracaoMs + 380);
    return () => {
      window.clearTimeout(tFade);
      window.clearTimeout(tFim);
    };
  }, [duracaoMs]);

  if (!visivel) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[9999] grid place-items-center bg-background"
      style={{
        opacity: saindo ? 0 : 1,
        transition: "opacity 360ms var(--ease-apple-out)",
        pointerEvents: saindo ? "none" : "auto",
      }}
    >
      <IntergoLogoMotion size={210} />
    </div>
  );
}

export default IntergoSplash;
