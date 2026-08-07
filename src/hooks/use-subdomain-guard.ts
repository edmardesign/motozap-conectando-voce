import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { detectPersona, personaConfig, isPathAllowed } from "@/lib/subdomain";

/**
 * On subdomain-scoped hosts (passageiro./mototaxista./admin.), redirect
 * out-of-scope routes back to the persona's start path. Also swaps the
 * manifest <link> and document title to match the persona.
 */
export function useSubdomainGuard() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persona = detectPersona();
    const cfg = personaConfig[persona];

    // Swap manifest link
    const existing = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (existing) {
      if (!existing.href.endsWith(cfg.manifest)) existing.href = cfg.manifest;
    } else {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = cfg.manifest;
      document.head.appendChild(link);
    }

    // document.title é gerenciado pelo head() de cada rota (TanStack).

    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (theme) theme.content = cfg.themeColor;

    if (persona === "root") return;

    if (!isPathAllowed(persona, pathname)) {
      navigate({ to: cfg.startPath, replace: true });
    }
  }, [pathname, navigate]);
}
