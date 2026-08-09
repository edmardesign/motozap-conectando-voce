import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { supabase } from "@/integrations/supabase/client";
import { EmojiIcon } from "@/components/emoji-icon";
import iconAdmin from "@/assets/btn-administrador.png.asset.json";


export const Route = createFileRoute("/adm")({
  head: () => ({
    meta: [
      { title: "InterGO Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Painel administrativo InterGO" },
    ],
  }),
  component: AdminEntry,
});

type Phase = "anim" | "install";

function AdminEntry() {
  const navigate = useNavigate();
  const { canInstall, installed, install } = usePwaInstall();
  const [phase, setPhase] = useState<Phase>("anim");

  useEffect(() => {
    // Se já há sessão válida, pula splash e vai direto para /admin
    // (que redireciona por nível: principal → /adm/gestao, subadmin/embaixador → /adm/painel).
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/admin", replace: true });
        return;
      }
      const seen = (() => { try { return sessionStorage.getItem("boraze.adm.splashSeen"); } catch { return null; } })();
      if (seen) { setPhase("install"); return; }
      const t = setTimeout(() => {
        try { sessionStorage.setItem("boraze.adm.splashSeen", "1"); } catch {}
        setPhase("install");
      }, 1800);
      return () => clearTimeout(t);
    })();
  }, [navigate]);


  async function handleInstall() {
    const ok = await install();
    if (ok) toast.success("App instalado!");
  }

  if (phase === "anim") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <img
          src={iconAdmin.url}
          alt="InterGO Admin"
          className="w-40 max-w-[50vw] h-auto animate-scale-in"
          style={{ filter: "drop-shadow(0 12px 28px rgba(17,17,17,0.15))" }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-between px-6 py-12 bg-background animate-fade-in">
      <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col items-center justify-between gap-8">
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 w-full">
          <img
            src={iconAdmin.url}
            alt="InterGO Admin"
            className="w-36 h-36 rounded-3xl"
            style={{ filter: "drop-shadow(0 12px 24px rgba(17,17,17,0.12))" }}
          />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">INTERGO</h1>
            <p className="text-muted-foreground text-sm mt-1 tracking-widest">ADMIN</p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          {canInstall && !installed && (
            <button
              onClick={handleInstall}
              className="w-full rounded-2xl px-6 py-4 font-bold text-center transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: "#3DB54A",
                color: "#FFFFFF",
                boxShadow: "0 10px 28px -12px rgba(61,181,74,0.6)",
                letterSpacing: "0.02em",
              }}
            >
              <EmojiIcon e="📲" color="#FFFFFF" /> INSTALAR NO CELULAR
            </button>
          )}

          <button
            onClick={() => navigate({ to: "/admin" })}
            className="w-full rounded-2xl px-6 py-4 font-bold text-center transition-all active:scale-[0.98]"
            style={{
              background: "#FFFFFF",
              color: "#111111",
              border: "1px solid #E8E8E8",
              boxShadow: "0 1px 2px rgba(17,17,17,0.06)",
            }}
          >
            JÁ TENHO ACESSO
          </button>

          <button
            onClick={() => {
              toast.info("Peça ao administrador principal um código de ativação de 6 dígitos e faça login em seguida.");
              navigate({ to: "/admin" });
            }}
            className="w-full rounded-2xl px-6 py-3 font-medium text-center transition-all active:scale-[0.98] border border-border text-foreground hover:bg-muted"
          >
            Ativar meu acesso
          </button>

        </div>
      </div>
    </main>
  );
}
