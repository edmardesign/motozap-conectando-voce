import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CarrinhoMercadoProvider } from "@/lib/mercado/carrinho";
import { MercadoTabBar, MERCADO_TABBAR_HEIGHT } from "@/components/mercado/tabbar";

export const Route = createFileRoute("/mercado")({
  head: () => ({
    meta: [
      { title: "Mercado — Bora Zé!" },
      { name: "description", content: "Peça mercado com entrega rápida pelo Bora Zé!" },
      { property: "og:title", content: "Mercado — Bora Zé!" },
      { property: "og:description", content: "Mercados, hortifruti e ofertas na sua cidade." },
    ],
  }),
  component: PedirLayout,
});

function PedirLayout() {
  return (
    <CarrinhoMercadoProvider>
      <div
        className="dz"
        style={{ minHeight: "100dvh", paddingBottom: MERCADO_TABBAR_HEIGHT + 16 }}
      >
        <Link
          to="/escolher"
          aria-label="Trocar serviço"
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top,0px) + 10px)",
            right: 12,
            zIndex: 50,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.92)",
            color: "#0E1116",
            border: "1px solid #E1E4EA",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            textDecoration: "none",
            backdropFilter: "blur(6px)",
            boxShadow: "0 4px 14px -6px rgba(15,20,30,0.10)",
          }}
        >
          <ArrowLeft size={14} /> Trocar serviço
        </Link>
        <Outlet />
        <MercadoTabBar />
      </div>
    </CarrinhoMercadoProvider>
  );
}
