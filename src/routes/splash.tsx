import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { toast } from "sonner";
import iconMz from "@/assets/boraze-icon-anim.png.asset.json";
import textMz from "@/assets/boraze-text-anim.png.asset.json";
import logoMz from "@/assets/boraze-full-anim.png.asset.json";
import { EmojiIcon } from "@/components/emoji-icon";

export const Route = createFileRoute("/splash")({
  head: () => ({
    meta: [
      { title: "InterGO — Mototáxi rápido na sua cidade" },
      { name: "description", content: "InterGO: peça mototáxi em minutos nas cidades do interior. Para passageiros e mototaxistas." },
    ],
  }),
  component: Splash,
});

type Phase = "icon" | "text" | "done";

function Splash() {
  const { canInstall, installed, install } = usePwaInstall();
  const [phase, setPhase] = useState<Phase>("icon");
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("boraze.splashSeen")) {
      setPhase("done");
      setShowInstall(true);
      return;
    }
    const t1 = setTimeout(() => setPhase("text"), 500);
    const t2 = setTimeout(() => {
      setPhase("done");
      try { sessionStorage.setItem("boraze.splashSeen", "1"); } catch {}
    }, 1000);
    const t3 = setTimeout(() => setShowInstall(true), 1300);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  async function handleInstall() {
    const ok = await install();
    if (ok) toast.success("App instalado!");
  }

  if (phase !== "done") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background overflow-hidden">
        <img
          src={iconMz.url}
          alt="InterGO"
          className="w-40 max-w-[50vw] h-auto absolute transition-opacity duration-500 ease-in-out"
          style={{
            opacity: phase === "icon" ? 1 : 0,
            filter: "drop-shadow(0 0 32px rgba(0,255,26,0.5))",
          }}
        />
        <img
          src={textMz.url}
          alt="InterGO"
          className="w-72 max-w-[80vw] h-auto absolute transition-all duration-500 ease-out"
          style={{
            opacity: phase === "text" ? 1 : 0,
            transform: phase === "text" ? "scale(1)" : "scale(0.92)",
            filter: "drop-shadow(0 0 24px rgba(0,255,26,0.4))",
          }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-between px-6 py-12 bg-background animate-fade-in">
      <div className="w-full max-w-[480px] mx-auto flex-1 flex flex-col items-center justify-between">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 w-full">
        <img
          src={logoMz.url}
          alt="InterGO"
          className="w-72 max-w-[85vw] h-auto drop-shadow-[0_0_24px_rgba(0,255,26,0.35)] animate-scale-in"
        />
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <Link
          to="/cadastro/passageiro"
          className="w-full rounded-2xl px-6 py-4 font-bold text-center border-2 transition-all active:scale-[0.98]"
          style={{
            background: "#000000",
            color: "#00FF1A",
            borderColor: "#00FF1A",
            boxShadow: "0 0 24px rgba(0,255,26,0.25)",
            letterSpacing: "0.02em",
          }}
        >
          INTERGO
        </Link>
        <Link
          to="/auth/passageiro"
          className="text-center text-sm text-white/70 hover:text-white underline"
        >
          Já tenho conta
        </Link>
        <Link
          to="/mototaxista/auth"
          className="w-full rounded-2xl px-6 py-4 font-bold text-center transition-all active:scale-[0.98]"
          style={{
            background: "#00FF1A",
            color: "#000000",
            boxShadow: "0 0 24px rgba(0,255,26,0.35)",
            letterSpacing: "0.02em",
          }}
        >
          INTERGO MOTO-TAXISTA
        </Link>
        {canInstall && showInstall && (
          <button
            onClick={handleInstall}
            className="w-full rounded-2xl px-6 py-4 font-bold text-center transition-all active:scale-[0.98] animate-fade-in flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #00FF1A, #00CC15)",
              color: "#000000",
              boxShadow: "0 0 32px rgba(0,255,26,0.55)",
              letterSpacing: "0.02em",
            }}
          >
            <EmojiIcon e="📲" color="#000000" /> INSTALAR NO CELULAR
          </button>
        )}
        {installed && (
          <p className="text-center text-sm text-white/60">App instalado <EmojiIcon e="✓" /></p>
        )}

        {/* Acesso administrativo intencionalmente oculto: use /admin diretamente. */}

      </div>
      </div>
    </main>
  );
}
