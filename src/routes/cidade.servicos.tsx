import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCidadeLocal } from "@/lib/cidade-local";
import { EmojiIcon } from "@/components/emoji-icon";
import { type ServiceIntent } from "@/lib/service-intent";
import { buscarServicosDaCidade } from "@/lib/cidade-perfil";
import { useTapGuard } from "@/hooks/use-tap-guard";
import logoMz from "@/assets/boraze-full-anim.png.asset.json";

type ServicosCidade = {
  delivery_ativo: boolean;
  mercado_ativo: boolean;
  mototaxi_ativo: boolean;
  cidade_cadastrada: boolean;
};

export const Route = createFileRoute("/cidade/servicos")({
  ssr: false,
  // Só é exibida após o cadastro concluído.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/cadastro/passageiro" });
  },
  head: () => ({
    meta: [
      { title: "Serviços disponíveis — Bora Zé!" },
      {
        name: "description",
        content:
          "Veja quais serviços do Bora Zé! (Delivery, Mercado e Moto Táxi) estão disponíveis na sua cidade.",
      },
    ],
  }),
  component: ServicosDaCidade,
});

const NEON = "#00FF1A";

function ServicosDaCidade() {
  const navigate = useNavigate();
  const [cidade, setCidade] = useState<{ uf: string; cidade: string } | null>(null);
  const [servicos, setServicos] = useState<ServicosCidade | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const c = getCidadeLocal();
    if (!c) {
      navigate({ to: "/cidade", replace: true });
      return;
    }
    setCidade({ uf: c.uf, cidade: c.cidade });

    let cancel = false;
    (async () => {
      const s = await buscarServicosDaCidade(c.uf, c.cidade);
      if (cancel) return;
      setServicos(s);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [navigate]);

  const nenhumAtivo =
    servicos &&
    !servicos.delivery_ativo &&
    !servicos.mercado_ativo &&
    !servicos.mototaxi_ativo;

  return (
    <main className="min-h-screen bg-background text-white flex flex-col">
      <div className="w-full max-w-[480px] mx-auto px-6 pt-8 pb-10 flex-1 flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-3">
          <img
            src={logoMz.url}
            alt="Bora Zé!"
            className="w-36 h-auto drop-shadow-[0_0_20px_rgba(0,255,26,0.35)]"
          />
          {cidade && (
            <>
              <h1
                className="text-2xl font-black tracking-tight"
                style={{ color: NEON, letterSpacing: "0.02em" }}
              >
                {cidade.cidade.toUpperCase()}
              </h1>
              <p className="text-sm text-white/70">
                Serviços disponíveis na sua cidade
              </p>
            </>
          )}
        </div>



        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-white/60">
            Carregando serviços...
          </div>
        ) : nenhumAtivo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-10">
            <div className="text-5xl" aria-hidden>
              <EmojiIcon e="😔" />
            </div>
            <h2
              className="text-xl font-black leading-tight px-2"
              style={{ color: NEON, letterSpacing: "0.02em" }}
            >
              QUE PENA AINDA NÃO CHEGAMOS EM SUA CIDADE, EM BREVE ESTAREMOS POR AQUI!
            </h2>
            <Link
              to="/cidade"
              className="text-xs text-white/60 underline hover:text-white/90"
            >
              Trocar cidade
            </Link>
            <a
              href="#"
              className="mt-8 text-[11px] text-white/40 hover:text-white/70 underline"
            >
              Seja um Embaixador BORA ZÉ!
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {servicos?.mototaxi_ativo && (
              <ServiceButton
                emoji="🏍️"
                title="MOTO TÁXI"
                subtitle="Peça uma corrida em minutos"
                bg="#000000"
                color={NEON}
                border={NEON}
                intent="mototaxi"
              />
            )}
            {servicos?.delivery_ativo && (
              <ServiceButton
                emoji="🍔"
                title="DELIVERY"
                subtitle="Comida das melhores lojas"
                bg={NEON}
                color="#000000"
                intent="delivery"
              />
            )}
            {servicos?.mercado_ativo && (
              <ServiceButton
                emoji="🛒"
                title="MERCADO"
                subtitle="Compre e receba em casa"
                bg="#FFFFFF"
                color="#000000"
                intent="mercado"
              />
            )}
            <Link
              to="/cidade"
              className="text-center text-xs text-white/50 mt-1 underline hover:text-white/80"
            >
              Trocar cidade
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}

function ServiceButton({
  emoji,
  title,
  subtitle,
  bg,
  color,
  border,
  intent,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  bg: string;
  color: string;
  border?: string;
  intent: ServiceIntent;
}) {
  const navigate = useNavigate();
  const tapReady = useTapGuard();
  function handleClick() {
    // Ignora "ghost taps" herdados da tela anterior.
    if (!tapReady()) return;
    // Usuário já está cadastrado neste ponto → vai direto para o serviço.
    navigate({ to: destinoOf(intent) });
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-2xl px-5 py-4 font-bold text-left transition-all active:scale-[0.98] flex items-center gap-4"
      style={{
        background: bg,
        color,
        border: border ? `2px solid ${border}` : "none",
        boxShadow:
          bg === "#000000"
            ? "0 0 24px rgba(0,255,26,0.25)"
            : bg === "#FFFFFF"
            ? "0 4px 16px rgba(255,255,255,0.15)"
            : "0 0 24px rgba(0,255,26,0.35)",
        letterSpacing: "0.02em",
      }}
    >
      <span className="text-3xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="flex flex-col">
        <span className="text-base tracking-wide">{title}</span>
        <span
          className="text-xs font-normal opacity-80"
          style={{ letterSpacing: 0 }}
        >
          {subtitle}
        </span>
      </span>
    </button>
  );
}

function destinoOf(intent: ServiceIntent): string {
  switch (intent) {
    case "delivery":
      return "/pedir";
    case "mercado":
      return "/mercado";
    case "mototaxi":
      return "/passageiro/home";
  }
}
