import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { toast } from "sonner";
import { EmojiIcon } from "@/components/emoji-icon";
import { BoraZeIntroAnimation } from "@/components/boraze-intro-animation";

export const Route = createFileRoute("/splash")({
  head: () => ({
    meta: [
      { title: "Intergo Logística — Sua plataforma completa de logística e mobilidade urbana" },
      { name: "description", content: "Intergo Logística: Mobilidade inteligente para servidores e cidadãos." },
    ],
  }),
  component: Splash,
});

function Splash() {
  const { canInstall, installed, install } = usePwaInstall();
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("intergo.splashSeen")) {
      setShowActions(true);
      return;
    }
    const t = setTimeout(() => {
      setShowActions(true);
      try { sessionStorage.setItem("intergo.splashSeen", "1"); } catch { /* ignora */ }
    }, 1700);
    return () => clearTimeout(t);
  }, []);

  async function handleInstall() {
    const ok = await install();
    if (ok) toast.success("App instalado!");
  }

  return (
    <main
      className="flex flex-col items-center justify-between bg-background"
      style={{
        minHeight: "100dvh",
        padding: "calc(env(safe-area-inset-top,0px) + 32px) 24px calc(env(safe-area-inset-bottom,0px) + 32px)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center justify-between gap-10">
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <BoraZeIntroAnimation storageKey="intergo.intro.splash" />
        </div>

        {showActions && (
          <div className="flex w-full flex-col gap-3">
            <Link
              to="/cadastro/passageiro"
              className="animate-apple-rise stagger-1 btn-hero w-full"
            >
              Pedir mototáxi
            </Link>
            <Link
              to="/mototaxista/auth"
              className="animate-apple-rise stagger-2 btn-outline-neon w-full"
            >
              Sou mototaxista
            </Link>
            {canInstall && (
              <button
                onClick={handleInstall}
                className="animate-apple-rise stagger-3 btn-cta w-full"
              >
                <EmojiIcon e="📲" color="#FFFFFF" /> Instalar no celular
              </button>
            )}
            {installed && (
              <p className="animate-apple-fade stagger-3 text-center text-sm text-muted-foreground">
                App instalado <EmojiIcon e="✓" />
              </p>
            )}
            <Link
              to="/auth/passageiro"
              className="animate-apple-fade stagger-4 mt-1 text-center text-[15px] font-medium text-foreground transition-opacity hover:opacity-70"
            >
              Já tenho conta
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
