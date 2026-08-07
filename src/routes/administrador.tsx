import { createFileRoute, redirect } from "@tanstack/react-router";
import { PublicLanding } from "@/components/public-landing";
import { supabase } from "@/integrations/supabase/client";
import iconAdmin from "@/assets/btn-administrador.png.asset.json";

export const Route = createFileRoute("/administrador")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/adm/painel" });
  },
  head: () => ({
    meta: [
      { title: "InterGO Administrador" },
      { name: "description", content: "Painel administrativo InterGO" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "manifest", href: "/manifest-administrador.webmanifest" }],
  }),
  component: () => (
    <PublicLanding
      persona="administrador"
      title="ADMINISTRADOR"
      subtitle="Gestão de cidades e operações"
      iconUrl={iconAdmin.url}
      accent="#FFFFFF"
      manifestHref="/manifest-administrador.webmanifest"
      themeColor="#000000"
    />
  ),
});
