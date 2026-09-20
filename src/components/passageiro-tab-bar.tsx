import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, Route as RouteIcon, User } from "lucide-react";

type TabId = "home" | "servicos" | "viagens" | "perfil";

type Tab = {
  id: TabId;
  label: string;
  to: string;
  search?: Record<string, string>;
  Icon: typeof Home;
};

const TABS: Tab[] = [
  { id: "home", label: "Início", to: "/passageiro/home", Icon: Home },
  { id: "servicos", label: "Serviços", to: "/passageiro/mobilidade", Icon: LayoutGrid },
  { id: "viagens", label: "Viagens", to: "/passageiro/corridas", Icon: RouteIcon },
  { id: "perfil", label: "Perfil", to: "/passageiro/perfil", Icon: User },
];

export function PassageiroTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-border bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((t) => {
        const isActive = pathname === t.to || pathname.startsWith(t.to + "/");
        const Icon = t.Icon;
        return (
          <Link
            key={t.id}
            to={t.to}
            search={(t.search ?? {}) as never}
            aria-label={t.label}
            className="flex h-16 flex-1 items-center justify-center transition-colors"
          >
            <span
              className={`flex h-full w-[76px] flex-col items-center justify-center gap-1 rounded-2xl ${
                isActive ? "bg-fill-quaternary text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={24} strokeWidth={1.8} aria-hidden />
              <span className="max-w-full truncate px-1 text-[10px] font-medium">{t.label}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
