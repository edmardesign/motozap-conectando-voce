import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/adm/negado")({
  head: () => ({
    meta: [
      { title: "Acesso administrativo negado" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NegadoPage,
});

function NegadoPage() {
  async function sair() {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    window.location.href = "/admin";
  }
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-background text-foreground">
      <div className="max-w-md w-full rounded-2xl p-8 bg-card border border-white/10 text-center space-y-4">
        <h1 className="text-2xl font-bold">Acesso não autorizado</h1>
        <p className="text-muted-foreground text-sm">
          Sua conta está autenticada, mas não possui um perfil administrativo
          ativo para acessar este painel. Se você foi convidado recentemente,
          verifique com o administrador que gerou seu convite.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <button onClick={sair} className="btn-cta w-full">Sair e voltar ao login</button>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            Ir para o app
          </Link>
        </div>
      </div>
    </main>
  );
}
