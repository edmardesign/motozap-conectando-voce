import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, ClipboardList, History, User } from "lucide-react";

type TabId = "home" | "solicitacoes" | "historico" | "perfil";

type Tab = {
  id: TabId;
  label: string;
  to: string;
  search?: Record<string, string>;
  Icon: typeof Home;
};

const TABS: Tab[] = [
  { id: "home", label: "Início", to: "/passageiro/home", Icon: Home },
  { id: "solicitacoes", label: "Solicitações", to: "/passageiro/corridas", Icon: ClipboardList },
  {
    id: "historico",
    label: "Histórico",
    to: "/passageiro/corridas",
    search: { historico: "1" },
    Icon: History,
  },
  { id: "perfil", label: "Perfil", to: "/passageiro/perfil", Icon: User },
];

export function PassageiroTabBar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr ?? "" });
  const isHistorico = searchStr.includes("historico=1");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t"
      style={{
        background: "#FFFFFF",
        borderTopColor: "#E8E8E8",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -1px 12px rgba(17,17,17,0.06)",
      }}
    >
      {TABS.map((t) => {
        const onRoute = pathname === t.to || pathname.startsWith(t.to + "/");
        const isActive =
          t.id === "historico"
            ? onRoute && isHistorico
            : t.id === "solicitacoes"
              ? onRoute && !isHistorico
              : onRoute;
        const Icon = t.Icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() =>
              navigate({ to: t.to, search: (t.search ?? {}) as any })
            }
            className="flex-1 relative flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
            style={{ color: isActive ? "#3DB54A" : "#6B6B6B" }}
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