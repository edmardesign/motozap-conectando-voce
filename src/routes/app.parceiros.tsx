// start_url do PWA Parceiros.
import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/parceiros")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/parceiros/painel" });
    throw redirect({ to: "/parceiros/auth" });
  },
});
