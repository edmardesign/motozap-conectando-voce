import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Heart, ShoppingCart, Receipt, Menu } from "lucide-react";

type Tab = { id: string; label: string; to: string; Icon: typeof Home; exact?: boolean };
const TABS: Tab[] = [
  { id: "home", label: "Início", to: "/mercado", Icon: Home, exact: true },
  { id: "favoritos", label: "Favoritos", to: "/mercado/buscar", Icon: Heart },
  { id: "carrinho", label: "Carrinho", to: "/mercado/carrinho", Icon: ShoppingCart },
  { id: "pedidos", label: "Pedidos", to: "/mercado/pedidos", Icon: Receipt },
  { id: "menu", label: "Menu", to: "/mercado/perfil", Icon: Menu },
];

export const MERCADO_TABBAR_HEIGHT = 84;

export function MercadoTabBar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed left-1/2 -translate-x-1/2 z-40 flex items-center"
      style={{
        bottom: "calc(env(safe-area-inset-bottom,0px) + 14px)",
        width: "min(92vw, 440px)",
        padding: 8,
        borderRadius: 999,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid rgba(0,255,26,0.25)",
        boxShadow: "0 18px 40px -18px rgba(15,20,30,0.35), 0 4px 14px -6px rgba(15,20,30,0.15)",
      }}
    >
      {TABS.map((t) => {
        const active = t.exact
          ? pathname === t.to
          : pathname === t.to || pathname.startsWith(t.to + "/");
        const Icon = t.Icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => navigate({ to: t.to as never })}
            aria-label={t.label}
            aria-current={active ? "page" : undefined}
            className="flex-1 flex items-center justify-center transition-all active:scale-[0.94]"
            style={{
              height: 48,
              borderRadius: 999,
              background: active ? "#00FF1A" : "transparent",
              color: active ? "#00250A" : "#0E1116",
              boxShadow: active ? "0 6px 18px -6px rgba(0,255,26,0.55)" : "none",
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
          </button>
        );
      })}
    </nav>
  );
}
