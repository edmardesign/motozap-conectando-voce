// Detects which "app persona" the current subdomain represents.
// Used to render the right PWA manifest, title and route guards.

export type AppPersona = "passageiro" | "mototaxista" | "admin" | "root";

export function detectPersona(hostname?: string): AppPersona {
  if (typeof window === "undefined" && !hostname) return "root";
  const host = (hostname ?? window.location.hostname).toLowerCase();
  if (host.startsWith("passageiro.")) return "passageiro";
  if (host.startsWith("mototaxista.") || host.startsWith("moto.")) return "mototaxista";
  if (host.startsWith("admin.")) return "admin";
  return "root";
}

export const personaConfig: Record<
  AppPersona,
  { manifest: string; title: string; themeColor: string; startPath: string; allowedPrefixes: string[] }
> = {
  passageiro: {
    manifest: "/manifest-passageiro.webmanifest",
    title: "InterGO Passageiro",
    themeColor: "#3DB54A",
    startPath: "/passageiro",
    allowedPrefixes: ["/passageiro", "/auth/passageiro", "/cadastro/passageiro", "/splash"],
  },
  mototaxista: {
    manifest: "/manifest-mototaxista.webmanifest",
    title: "InterGO Mototaxista",
    themeColor: "#3DB54A",
    startPath: "/mototaxista",
    allowedPrefixes: ["/mototaxista", "/splash"],
  },
  admin: {
    manifest: "/manifest-admin.webmanifest",
    title: "InterGO Admin",
    themeColor: "#0F0F10",
    startPath: "/adm",
    allowedPrefixes: ["/adm", "/admin", "/auth"],
  },
  root: {
    manifest: "/manifest.webmanifest",
    title: "InterGO — Mototáxi rápido na sua cidade",
    themeColor: "#0F0F10",
    startPath: "/splash",
    allowedPrefixes: [], // no restriction
  },
};

export function isPathAllowed(persona: AppPersona, pathname: string): boolean {
  const cfg = personaConfig[persona];
  if (!cfg.allowedPrefixes.length) return true;
  return cfg.allowedPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}
