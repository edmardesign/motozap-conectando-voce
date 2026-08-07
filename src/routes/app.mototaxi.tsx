// start_url do PWA Mototáxi.
import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/mototaxi")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/mototaxista/home" });
    throw redirect({ to: "/mototaxista/auth" });
  },
});
