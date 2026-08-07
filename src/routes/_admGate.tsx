// Pathless layout que protege TODAS as rotas administrativas de nível
// hierárquico (Rodada 2.B). Executa a verificação de autorização ANTES
// de renderizar qualquer filho (via beforeLoad) — nenhum dado
// administrativo é buscado antes do gate liberar.
//
// Regras aplicadas:
//   1. Sem sessão            → /admin (login)
//   2. Sem perfil admin      → /adm/negado
//   3. Perfil suspenso/inativo → /adm/suspenso
//   4. admin_principal | subadmin | embaixador → libera <Outlet />
//
// beforeLoad re-executa em toda navegação para a subárvore, então
// permissões/vínculos revogados surtem efeito na próxima navegação sem
// exigir novo login. Também não confiamos em nada armazenado em
// localStorage: a fonte de verdade é o servidor via requireSupabaseAuth.
//
// ssr:false porque a sessão Supabase mora em localStorage; SSR não a
// enxerga e cairia em loop.

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMeuContextoAdmin } from "@/lib/admin-hier.functions";

export const Route = createFileRoute("/_admGate")({
  ssr: false,
  beforeLoad: async () => {
    // 1) Sessão local (evita chamar servidor sem token)
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw redirect({ to: "/admin" });
    }

    // 2) Contexto autorizado no servidor (RLS + RPC SECURITY DEFINER)
    let ctx: Awaited<ReturnType<typeof getMeuContextoAdmin>>;
    try {
      ctx = await getMeuContextoAdmin();
    } catch {
      // Token inválido/expirado → volta para login
      throw redirect({ to: "/admin" });
    }

    // 3) Suspenso / inativo tem prioridade sobre "sem perfil"
    if (ctx.has_profile && (!ctx.perfil_ativo || ctx.perfil_suspenso)) {
      throw redirect({ to: "/adm/suspenso" });
    }

    // 4) Nenhum perfil administrativo → acesso negado
    if (!ctx.nivel) {
      throw redirect({ to: "/adm/negado" });
    }

    // 5) Autorizado — disponibiliza contexto para toda a subárvore
    return { adminCtx: ctx };
  },
  component: () => <Outlet />,
});
