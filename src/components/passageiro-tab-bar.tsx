import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, List, Wallet, User } from "lucide-react";

type TabId = "home" | "corridas" | "carteira" | "perfil";

const TABS: { id: TabId; label: string; to: string; Icon: typeof Home }[] = [
  { id: "home", label: "Início", to: "/passageiro/home", Icon: Home },
  { id: "corridas", label: "Minhas corridas", to: "/passageiro/corridas", Icon: List },
  { id: "carteira", label: "Carteira", to: "/passageiro/carteira", Icon: Wallet },
  { id: "perfil", label: "Perfil", to: "/passageiro/perfil", Icon: User },
];

export function PassageiroTabBar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t"
      style={{
        background: "#131F24",
        borderTopColor: "rgba(134,150,160,0.15)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.4)",
      }}
    >
      {TABS.map((t) => {
        const isActive = pathname === t.to || pathname.startsWith(t.to + "/");
        const Icon = t.Icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => navigate({ to: t.to })}
            className="flex-1 relative flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
            style={{ color: isActive ? "#3DB54A" : "#8696A0" }}
          >
            <Icon size={20} aria-hidden />
            <span className="text-[11px] font-medium tracking-wide truncate max-w-full px-1">
              {t.label}
            </span>
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-10 rounded-b-full"
                style={{ background: "#3DB54A" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export const PASSAGEIRO_TABBAR_HEIGHT = 64;
