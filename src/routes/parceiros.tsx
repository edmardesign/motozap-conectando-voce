import { createFileRoute, redirect } from "@tanstack/react-router";
import { PublicLanding } from "@/components/public-landing";
import { supabase } from "@/integrations/supabase/client";
import iconEntregas from "@/assets/btn-entregas.png.asset.json";

export const Route = createFileRoute("/parceiros")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/parceiros/painel" });
  },
  head: () => ({
    meta: [
      { title: "Bora Zé! Parceiros — Venda mais com o Bora Zé!" },
      { name: "description", content: "Cadastre seu restaurante ou loja e receba pedidos via Bora Zé!" },
      { property: "og:title", content: "Bora Zé! Parceiros" },
      { property: "og:description", content: "Venda mais com o Bora Zé!" },
    ],
    links: [{ rel: "manifest", href: "/manifest-parceiros.webmanifest" }],
  }),
  component: () => (
    <PublicLanding
      persona="parceiros"
      title="PARCEIROS"
      subtitle="Venda mais com o Bora Zé!"
      iconUrl={iconEntregas.url}
      accent="#00FF1A"
      manifestHref="/manifest-parceiros.webmanifest"
      themeColor="#00FF1A"
      loginHref="/parceiros/auth"
    />
  ),
});
