// start_url do PWA Passageiro. Redireciona para a tela de escolha do Cliente.
import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/passageiro")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/passageiro/home" });
    throw redirect({ to: "/auth/passageiro" });
  },
});
