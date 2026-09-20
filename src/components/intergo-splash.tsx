import { useEffect, useState } from "react";
import wordmarkAsset from "@/assets/intergo-wordmark.png.asset.json";

/** Exibida a cada abertura do app (uma vez por carregamento de página). */
let jaExibidaNestaSessaoDePagina = false;

/**
 * Splash minimalista: fundo preto sólido + wordmark centralizado com fade-in de 300ms.
 * Sem qualquer outra animação.
 */
export function IntergoSplash({ duracaoMs = 1200 }: { duracaoMs?: number }) {
  const [visivel, setVisivel] = useState(false);
  const [entrou, setEntrou] = useState(false);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (jaExibidaNestaSessaoDePagina) return;
    jaExibidaNestaSessaoDePagina = true;
    setVisivel(true);
    const tEntrada = window.requestAnimationFrame(() => setEntrou(true));
    const tFade = window.setTimeout(() => setSaindo(true), duracaoMs);
    const tFim = window.setTimeout(() => setVisivel(false), duracaoMs + 320);
    return () => {
      window.cancelAnimationFrame(tEntrada);
      window.clearTimeout(tFade);
      window.clearTimeout(tFim);
    };
  }, [duracaoMs]);

  if (!visivel) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[9999] grid place-items-center"
      style={{
        background: "#000000",
        opacity: saindo ? 0 : 1,
        transition: "opacity 300ms linear",
        pointerEvents: saindo ? "none" : "auto",
      }}
    >
      <img
        src={wordmarkAsset.url}
        alt=""
        className="h-9 w-auto"
        style={{
          opacity: entrou ? 1 : 0,
          transition: "opacity 300ms linear",
          filter: "brightness(0) invert(1)",
        }}
      />
    </div>
  );
}

export default IntergoSplash;
