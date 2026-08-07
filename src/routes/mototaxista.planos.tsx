import { useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Zap, TrendingUp, Crown, Check, ArrowDown } from "lucide-react";
import { EmojiIcon } from "@/components/emoji-icon";

export const Route = createFileRoute("/mototaxista/planos")({
  head: () => ({
    meta: [
      { title: "Comece a receber mais corridas — InterGO" },
      {
        name: "description",
        content:
          "Entre para a plataforma InterGO e conecte-se a passageiros, empresas e entregas na sua cidade.",
      },
    ],
  }),
  component: PlanosPage,
});

type PlanoId = "mensal" | "semestral" | "anual";

interface Plano {
  id: PlanoId;
  nome: string;
  badge?: string;
  badgeEmoji?: string;
  Icon: React.ComponentType<{ className?: string }>;
  precoDestaque: string;
  cobrancaDiscreta?: string;
  subtexto: string;
  beneficios: string[];
  cta: string;
  recomendado?: boolean;
  hero?: boolean;
}

const PLANOS: Plano[] = [
  {
    id: "mensal",
    nome: "Mensal",
    Icon: Zap,
    precoDestaque: "R$49/mês",
    subtexto: "Ideal para começar agora sem compromisso.",
    beneficios: [
      "Acesso completo ao app",
      "Receba corridas de passageiros",
      "Receba entregas de empresas",
      "Suporte via WhatsApp",
    ],
    cta: "COMEÇAR GRÁTIS",
  },
  {
    id: "semestral",
    nome: "Prata",
    badge: "economize 15%",
    badgeEmoji: "",
    Icon: TrendingUp,
    precoDestaque: "R$41,50/mês",
    cobrancaDiscreta: "cobrado R$249 a cada 6 meses",
    subtexto: "O equilíbrio entre economia e flexibilidade.",
    beneficios: [
      "Tudo do plano Mensal",
      "6 meses sem reajuste",
      "Selo de mototaxista verificado",
      "Mais visibilidade na cidade",
    ],
    cta: "COMEÇAR GRÁTIS",
    recomendado: true,
  },
  {
    id: "anual",
    nome: "Ouro",
    badge: "economize 24%",
    badgeEmoji: "",
    Icon: Crown,
    precoDestaque: "R$37,42/mês",
    cobrancaDiscreta: "cobrado R$449 por ano",
    subtexto: "O maior desconto para quem pensa no longo prazo.",
    beneficios: [
      "Tudo do plano Prata",
      "1 ano de plataforma garantido",
      "Selo Ouro destacado no perfil",
      "Prioridade no sorteio de corridas",
    ],
    cta: "COMEÇAR GRÁTIS",
    hero: true,
  },
];

function PlanosPage() {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  function escolher(plano: PlanoId) {
    sessionStorage.setItem("motozap.plano_escolhido", plano);
    setProcessing(true);
    setTimeout(() => {
      navigate({ to: "/mototaxista/cadastro" });
    }, 1200);
  }

  function scrollToCards() {
    cardsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (processing) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="card-mz p-8 max-w-sm w-full text-center flex flex-col items-center gap-5">
          <Loader2 className="w-14 h-14 animate-spin" style={{ color: "var(--color-neon)" }} />
          <h1 className="text-2xl font-display">Processando sua entrada</h1>
          <p className="text-white/70 text-sm font-sans">
            Aguarde alguns segundos enquanto liberamos seu acesso à plataforma...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(0,255,26,0.18), transparent 70%), radial-gradient(40% 40% at 90% 30%, rgba(0,255,26,0.08), transparent 70%), radial-gradient(35% 35% at 10% 80%, rgba(0,255,26,0.07), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,26,0.6), transparent)" }}
      />

      {/* Floating banner */}
      <div className="sticky top-0 z-20 w-full">
        <div
          className="mx-auto max-w-xl px-4 pt-3"
          style={{ color: "#000000" }}
        >
          <div
            className="flex items-center justify-center gap-2 rounded-b-xl px-4 py-2.5 text-xs sm:text-sm font-button tracking-wide text-center"
            style={{ background: "#00FF1A" }}
          >
            <span><EmojiIcon e="🎁" /> Mais passageiros. Mais encomendas. Para você! — 1º mês grátis</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-10 pb-4 text-center">
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl leading-[0.95] uppercase">
          Comece <span style={{ color: "#00FF1A" }}>GRÁTIS</span> hoje.
        </h1>

        <p className="mt-4 text-lg sm:text-xl font-sans" style={{ color: "#00FF1A" }}>
          Seu primeiro mês é por nossa conta.
        </p>

        <p className="mt-2 text-sm sm:text-base font-sans" style={{ color: "#8696A0" }}>
          Escolha seu plano e ative depois. Sem cartão. Sem compromisso.
        </p>

        <button
          onClick={scrollToCards}
          className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-button tracking-wider uppercase transition-transform hover:scale-105"
          style={{ background: "#00FF1A", color: "#000000" }}
        >
          VER PLANOS
          <ArrowDown className="w-4 h-4" />
        </button>
      </section>

      {/* Plans grid */}
      <section ref={cardsRef} className="mx-auto max-w-6xl px-5 pb-6 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-stretch">
          {PLANOS.map((p) => (
            <PlanCard key={p.id} plano={p} onChoose={() => escolher(p.id)} />
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 text-sm text-white/70 font-sans text-center">
          <p><EmojiIcon e="🔒" /> Sem contrato. Sem multa. Cancele quando quiser.</p>
          <p><EmojiIcon e="✅" /> Suporte via WhatsApp incluído</p>
          <p><EmojiIcon e="✅" /> Acesso imediato após cadastro</p>
        </div>
      </section>
    </main>
  );
}

function PlanCard({ plano, onChoose }: { plano: Plano; onChoose: () => void }) {
  const { Icon } = plano;
  const isHero = plano.hero;
  const isRec = plano.recomendado;
  const featured = isHero || isRec;

  return (
    <div
      className={[
        "group relative flex flex-col rounded-2xl border p-6 sm:p-7 backdrop-blur-xl",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1",
        isHero ? "md:scale-[1.04] md:-my-2" : "",
      ].join(" ")}
      style={{
        borderColor: featured ? "rgba(0,255,26,0.55)" : "rgba(255,255,255,0.08)",
        background: featured
          ? "linear-gradient(160deg, rgba(0,255,26,0.10), rgba(0,0,0,0.4) 60%)"
          : "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
        boxShadow: featured
          ? "0 0 0 1px rgba(0,255,26,0.15) inset, 0 20px 60px -20px rgba(0,255,26,0.45), 0 0 80px -30px rgba(0,255,26,0.6)"
          : "0 12px 32px -16px rgba(0,0,0,0.8)",
      }}
    >
      {plano.badge && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-button tracking-[0.18em] uppercase"
          style={{
            background: isHero ? "var(--color-neon)" : "rgba(0,255,26,0.15)",
            color: isHero ? "var(--color-neon-foreground)" : "var(--color-neon)",
            border: isHero ? "none" : "1px solid rgba(0,255,26,0.4)",
            boxShadow: isHero ? "0 0 24px var(--neon-glow)" : "none",
          }}
        >
          {plano.badgeEmoji && <span className="mr-1">{plano.badgeEmoji}</span>}
          {plano.badge}
        </span>
      )}

      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110"
          style={{
            borderColor: "rgba(0,255,26,0.3)",
            background: "rgba(0,255,26,0.08)",
            color: "var(--color-neon)",
            boxShadow: featured ? "0 0 18px rgba(0,255,26,0.35)" : "none",
          }}
        >
          <Icon className="w-5 h-5" />
        </span>
        <h3 className="font-button text-2xl tracking-wider uppercase">{plano.nome}</h3>
      </div>

      {/* Price highlight */}
      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-5xl sm:text-6xl leading-none">
          {plano.precoDestaque}
        </span>
      </div>

      {/* Discreet billing info */}
      {plano.cobrancaDiscreta && (
        <p className="mt-1.5 text-xs text-white/40 font-sans">
          {plano.cobrancaDiscreta}
        </p>
      )}

      <p className="mt-3 text-sm text-white/65 font-sans leading-relaxed">{plano.subtexto}</p>

      <div
        className="my-6 h-px w-full"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
      />

      <ul className="flex-1 flex flex-col gap-3">
        {plano.beneficios.map((b) => (
          <li key={b} className="flex items-start gap-3 text-sm text-white/85 font-sans">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(0,255,26,0.15)", color: "var(--color-neon)" }}
            >
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onChoose}
        className={featured ? "btn-cta w-full mt-7" : "btn-outline-neon w-full mt-7"}
      >
        {plano.cta}
      </button>
    </div>
  );
}
