import { createFileRoute, redirect } from "@tanstack/react-router";
import { PublicLanding } from "@/components/public-landing";
import { supabase } from "@/integrations/supabase/client";
import iconPax from "@/assets/btn-passageiro.png.asset.json";

export const Route = createFileRoute("/passageiro/")({
  head: () => ({
    meta: [
      { title: "Bora Zé! — Delivery e Mototaxi na sua cidade" },
      { name: "description", content: "Peça comida ou mototaxi em minutos com o Bora Zé!" },
      { property: "og:title", content: "Bora Zé! — Delivery e Mototaxi na sua cidade" },
      { property: "og:description", content: "Peça comida ou mototaxi em minutos com o Bora Zé!" },
    ],
    links: [{ rel: "manifest", href: "/manifest-passageiro.webmanifest" }],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/escolher" });
  },
  component: () => (
    <PublicLanding
      persona="passageiro"
      title="USUÁRIO"
      subtitle="Peça comida ou mototaxi em minutos"
      iconUrl={iconPax.url}
      accent="#00FF1A"
      manifestHref="/manifest-passageiro.webmanifest"
      themeColor="#00FF1A"
      loginHref="/auth/passageiro"
    />
  ),
});
