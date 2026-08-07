import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/adm/suspenso")({
  head: () => ({
    meta: [
      { title: "Acesso administrativo suspenso" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SuspensoPage,
});

function SuspensoPage() {
  async function sair() {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    window.location.href = "/admin";
  }
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-background text-white">
      <div className="max-w-md w-full rounded-2xl p-8 bg-card border border-white/10 text-center space-y-4">
        <h1 className="text-2xl font-bold">Acesso administrativo suspenso</h1>
        <p className="text-white/70 text-sm">
          Seu perfil administrativo foi suspenso ou desativado. Enquanto
          estiver nesse estado, você não poderá acessar o painel. Contate o
          administrador principal para reativação.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <button onClick={sair} className="btn-cta w-full">Sair</button>
          <Link to="/" className="text-xs text-white/60 hover:text-white">
            Ir para o app
          </Link>
        </div>
      </div>
    </main>
  );
}
