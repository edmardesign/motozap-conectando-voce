import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AuthorizationDetails = {
  client?: { name?: string | null; logo_uri?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
  scopes?: string[] | null;
};

type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

function oauth(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      // Persist consent URL and bounce to splash (user picks passageiro/mototaxista/empresa).
      const returnTo = location.pathname + location.searchStr;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("motozap.oauth_return_to", returnTo);
        } catch {
          /* noop */
        }
      }
      throw redirect({ to: "/splash" });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center bg-[#000000] text-[#F5F5F5] p-6">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold mb-2">Não foi possível carregar a autorização</h1>
        <p className="text-sm text-[#8696A0]">
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "Um aplicativo";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou uma URL de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen bg-[#000000] text-[#F5F5F5] flex items-center justify-center p-6">
      <div
        className="w-full max-w-md rounded-2xl p-6 border"
        style={{
          background: "#111B21",
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        <h1 className="text-xl font-semibold mb-2">
          Conectar {clientName} à sua conta InterGO
        </h1>
        <p className="text-sm text-[#8696A0] mb-6">
          {clientName} poderá acessar seus dados no InterGO como se fosse você:
          seu perfil, suas corridas e (se aplicável) seu status de mototaxista.
        </p>

        {error && (
          <div
            role="alert"
            className="text-sm mb-4 p-3 rounded-lg"
            style={{ background: "rgba(255,80,80,0.1)", color: "#ff8080" }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 py-3 rounded-xl border text-sm font-medium disabled:opacity-50"
            style={{ borderColor: "rgba(255,255,255,0.15)", background: "#0a0a0a" }}
          >
            Negar
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "#00FF1A", color: "#000000" }}
          >
            {busy ? "Conectando..." : "Aprovar"}
          </button>
        </div>
      </div>
    </main>
  );
}
