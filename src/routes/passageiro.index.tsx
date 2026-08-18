import { createFileRoute, redirect } from "@tanstack/react-router";
import { PublicLanding } from "@/components/public-landing";
import { supabase } from "@/integrations/supabase/client";
import iconPax from "@/assets/btn-passageiro.png.asset.json";

export const Route = createFileRoute("/passageiro/")({
  head: () => ({
    meta: [
      { title: "InterGO — Mototáxi rápido na sua cidade" },
      { name: "description", content: "Peça seu mototáxi em minutos com o InterGO" },
      { property: "og:title", content: "InterGO — Mototáxi rápido na sua cidade" },
      { property: "og:description", content: "Peça seu mototáxi em minutos com o InterGO" },
    ],
    links: [{ rel: "manifest", href: "/manifest-passageiro.webmanifest" }],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/passageiro/home" });
  },
  component: () => (
    <PublicLanding
      persona="passageiro"
      title="SOU SERVIDOR"
      subtitle="Solicite transporte institucional em minutos"
      iconUrl={iconPax.url}
      accent="#3DB54A"
      manifestHref="/manifest-passageiro.webmanifest"
      themeColor="#3DB54A"
      loginHref="/auth/passageiro"
    />
  ),
});
