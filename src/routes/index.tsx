import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getCidadeLocal } from "@/lib/cidade-local";

// Rota raiz — novo fluxo:
// 1) Sem sessão  → landing pública /passageiro (leva ao cadastro).
// 2) Com sessão e SEM cidade escolhida → /cidade (escolha após o cadastro).
// 3) Com sessão e COM cidade → /passageiro/home.
export const Route = createFileRoute("/")({
  ssr: false,
  component: IndexGate,
});

function IndexGate() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/passageiro", replace: true });
        return;
      }
      const cidade = getCidadeLocal();
      if (!cidade) {
        navigate({ to: "/cidade", replace: true });
        return;
      }
      navigate({ to: "/passageiro/home", replace: true });
    })();
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-white/60 text-sm">Carregando…</div>
    </main>
  );
}
