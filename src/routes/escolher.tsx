// Tela "O que você deseja agora?" — hub do Cliente após login.
// Exibida em toda abertura autenticada, antes dos módulos DELIVERY / MOTOTÁXI.
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTapGuard } from "@/hooks/use-tap-guard";
import { ShoppingBag, Bike, LogOut, MapPin, User as UserIcon, ShoppingCart } from "lucide-react";
import logoMz from "@/assets/boraze-full-anim.png.asset.json";

const BG = "#000000";
const FG = "#F5F5F5";
const ACCENT = "#00FF1A";

export const Route = createFileRoute("/escolher")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "O que você deseja agora? — Bora Zé!" },
      { name: "description", content: "Escolha entre Delivery, Mercado ou Mototáxi no Bora Zé!" },
      { property: "og:title", content: "Bora Zé! — Cliente" },
      { property: "og:description", content: "Delivery, Mercado e Mototáxi em um só aplicativo." },
    ],
  }),
  beforeLoad: async () => {
    // Sessão obrigatória. Sem sessão → login.
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth/passageiro" });
  },
  component: EscolherServico,
});

function EscolherServico() {
  const navigate = useNavigate();
  const [nome, setNome] = useState<string>("");
  const tapReady = useTapGuard();

  // Só navega quando o toque for realmente do usuário nesta tela.
  function irPara(to: string) {
    if (!tapReady()) return;
    navigate({ to });
  }

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("profiles")
        .select("nome, tipo")
        .eq("id", uid)
        .maybeSingle();
      if (data?.nome) setNome(String(data.nome).split(" ")[0]);
      // Roteamento por tipo — cliente permanece; outros são levados à sua área.
      const tipo = (data as { tipo?: string } | null)?.tipo;
      if (tipo === "mototaxista") navigate({ to: "/mototaxista/home" });
      else if (tipo === "empresa") navigate({ to: "/empresa/home" });
      else if (tipo === "admin") navigate({ to: "/adm" });
    })();
  }, [navigate]);

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/passageiro" });
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: BG,
        color: FG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding:
          "calc(env(safe-area-inset-top,0px) + 32px) 24px calc(env(safe-area-inset-bottom,0px) + 24px)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440, margin: "0 auto", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
          <Link
            to="/cidade"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.75)",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            <MapPin size={14} /> Trocar cidade
          </Link>
          <button
            onClick={sair}
            aria-label="Sair"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.75)",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <LogOut size={14} /> Sair
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 8 }}>
          <img
            src={logoMz.url}
            alt="Bora Zé!"
            style={{
              width: 260,
              maxWidth: "80vw",
              height: "auto",
              filter: "drop-shadow(0 0 24px rgba(0,255,26,0.35))",
            }}
          />
          {nome && (
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
              <UserIcon size={14} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
              Olá, <strong style={{ color: FG }}>{nome}</strong>
            </p>
          )}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, paddingTop: 32 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              textAlign: "center",
              letterSpacing: "-0.5px",
              lineHeight: 1.2,
              color: FG,
            }}
          >
            O que você deseja agora?
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <button
              onClick={() => irPara("/pedir")}
              style={{
                width: "100%",
                borderRadius: 20,
                padding: "22px 24px",
                fontWeight: 900,
                fontSize: 20,
                letterSpacing: "0.06em",
                background: ACCENT,
                color: "#000",
                border: "none",
                boxShadow: `0 0 32px ${ACCENT}55`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                minHeight: 72,
              }}
            >
              <ShoppingBag size={24} /> DELIVERY
            </button>

            <button
              onClick={() => irPara("/mercado")}
              style={{
                width: "100%",
                borderRadius: 20,
                padding: "22px 24px",
                fontWeight: 900,
                fontSize: 20,
                letterSpacing: "0.06em",
                background: "#0A0A0A",
                color: ACCENT,
                border: `2px solid ${ACCENT}`,
                boxShadow: `0 0 24px ${ACCENT}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                minHeight: 72,
              }}
            >
              <ShoppingCart size={24} /> MERCADO
            </button>


            <button
              onClick={() => irPara("/passageiro/home")}
              style={{
                width: "100%",
                borderRadius: 20,
                padding: "22px 24px",
                fontWeight: 900,
                fontSize: 20,
                letterSpacing: "0.06em",
                background: "#0A0A0A",
                color: ACCENT,
                border: `2px solid ${ACCENT}`,
                boxShadow: `0 0 24px ${ACCENT}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                minHeight: 72,
              }}
            >
              <Bike size={24} /> MOTOTÁXI
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 24 }}>
          Bora Zé! — Delivery e Mototáxi
        </p>
      </div>
    </main>
  );
}
