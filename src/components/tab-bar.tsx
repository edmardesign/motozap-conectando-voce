import type { ReactNode } from "react";

interface Tab<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
}

interface TabBarProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
}

export function TabBar<T extends string>({ tabs, active, onChange }: TabBarProps<T>) {
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
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className="flex-1 relative flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
            style={{ color: isActive ? "#00FF1A" : "#8696A0" }}
          >
            <span className="text-xl leading-none" aria-hidden>{t.icon}</span>
            <span className="text-[11px] font-medium tracking-wide">{t.label}</span>
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-10 rounded-b-full"
                style={{ background: "#00FF1A" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
