import { createFileRoute, redirect } from "@tanstack/react-router";
import { PublicLanding } from "@/components/public-landing";
import { supabase } from "@/integrations/supabase/client";
import iconMoto from "@/assets/btn-mototaxista.png.asset.json";

export const Route = createFileRoute("/mototaxi")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/mototaxista/home" });
  },
  head: () => ({
    meta: [
      { title: "Bora Zé! Mototáxi — Cadastre-se e receba corridas" },
      { name: "description", content: "Instale o Bora Zé! Mototáxi e comece a receber corridas na sua cidade." },
      { property: "og:title", content: "Bora Zé! Mototáxi" },
      { property: "og:description", content: "Receba corridas e entregas na sua cidade." },
    ],
    links: [{ rel: "manifest", href: "/manifest-mototaxi.webmanifest" }],
  }),
  component: () => (
    <PublicLanding
      persona="mototaxi"
      title="MOTOTÁXI"
      subtitle="Ganhe rodando na sua cidade"
      iconUrl={iconMoto.url}
      accent="#00FF1A"
      manifestHref="/manifest-mototaxi.webmanifest"
      themeColor="#00FF1A"
    />
  ),
});
