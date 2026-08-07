// Detects which "app persona" the current subdomain represents.
// Used to render the right PWA manifest, title and route guards.

export type AppPersona = "passageiro" | "mototaxista" | "admin" | "food" | "parceiros" | "root";

export function detectPersona(hostname?: string): AppPersona {
  if (typeof window === "undefined" && !hostname) return "root";
  const host = (hostname ?? window.location.hostname).toLowerCase();
  if (host.startsWith("passageiro.")) return "passageiro";
  if (host.startsWith("mototaxista.") || host.startsWith("moto.")) return "mototaxista";
  if (host.startsWith("admin.")) return "admin";
  if (host.startsWith("parceiros.")) return "parceiros";
  if (host.startsWith("food.")) return "food";
  return "root";
}

export const personaConfig: Record<
  AppPersona,
  { manifest: string; title: string; themeColor: string; startPath: string; allowedPrefixes: string[] }
> = {
  passageiro: {
    manifest: "/manifest-passageiro.webmanifest",
    title: "Bora Zé! Passageiro",
    themeColor: "#00FF1A",
    startPath: "/passageiro",
    allowedPrefixes: ["/passageiro", "/auth/passageiro", "/cadastro/passageiro", "/splash"],
  },
  mototaxista: {
    manifest: "/manifest-mototaxista.webmanifest",
    title: "Bora Zé! Mototaxista",
    themeColor: "#00FF1A",
    startPath: "/mototaxista",
    allowedPrefixes: ["/mototaxista", "/splash"],
  },
  admin: {
    manifest: "/manifest-admin.webmanifest",
    title: "Bora Zé! Admin",
    themeColor: "#000000",
    startPath: "/adm",
    allowedPrefixes: ["/adm", "/admin", "/auth"],
  },
  food: {
    manifest: "/manifest-food.webmanifest",
    title: "Bora Zé Food",
    themeColor: "#00FF1A",
    startPath: "/food",
    allowedPrefixes: ["/food", "/empresa"],
  },
  parceiros: {
    manifest: "/manifest-parceiros.webmanifest",
    title: "Bora Zé! Parceiros",
    themeColor: "#00FF1A",
    startPath: "/parceiros",
    allowedPrefixes: ["/parceiros"],
  },
  root: {
    manifest: "/manifest.webmanifest",
    title: "Bora Zé! — Mototáxi rápido na sua cidade",
    themeColor: "#000000",
    startPath: "/splash",
    allowedPrefixes: [], // no restriction
  },
};

export function isPathAllowed(persona: AppPersona, pathname: string): boolean {
  const cfg = personaConfig[persona];
  if (!cfg.allowedPrefixes.length) return true;
  return cfg.allowedPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}
