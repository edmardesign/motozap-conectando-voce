import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import wordmarkAsset from "@/assets/intergo-wordmark.png.asset.json";

export interface PassageiroHeaderProps {
  backTo?: "/passageiro/home" | "/passageiro/mobilidade";
  title?: string;
  name?: string;
  className?: string;
}

export function PassageiroHeader({ backTo, title, name, className = "" }: PassageiroHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = useMemo(() => {
    if (name) return name;
    const metadataName = user?.user_metadata?.nome;
    return typeof metadataName === "string" && metadataName.trim() ? metadataName : "Servidor";
  }, [name, user]);
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  return (
    <header className={`sticky top-0 z-[1100] w-full border-b border-border/50 bg-background/90 backdrop-blur-md ${className}`}>
      <div className="mx-auto grid h-14 max-w-lg grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          {backTo && (
            <button
              type="button"
              aria-label="Voltar"
              onClick={() => navigate({ to: backTo })}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill-tertiary text-foreground"
            >
              <ChevronLeft size={21} strokeWidth={1.8} />
            </button>
          )}
          <img src={wordmarkAsset.url} alt="Intergo Logística" className="h-6 w-auto shrink-0" />
        </div>
        <span className="truncate text-center text-[15px] font-semibold">{title}</span>
        <button
          type="button"
          onClick={() => navigate({ to: "/passageiro/perfil" })}
          aria-label="Perfil do servidor"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill-tertiary text-xs font-semibold"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}