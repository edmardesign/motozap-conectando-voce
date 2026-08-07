import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Copy, Check, QrCode, Clock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { EmojiIcon } from "@/components/emoji-icon";

export const Route = createFileRoute("/mototaxista/pagamento")({
  head: () => ({
    meta: [
      { title: "Pague via Pix — InterGO" },
      { name: "description", content: "Pague seu plano via Pix manual e ative seu acesso." },
    ],
  }),
  component: PagamentoPage,
});

// <EmojiIcon e="🔑" /> Chave Pix da plataforma — edite aqui quando tiver a chave definitiva
const PIX_KEY = "[sua chave pix aqui]";
const PIX_BENEFICIARIO = "InterGO";

type PlanoId = "mensal" | "semestral" | "anual";

const PLANOS_INFO: Record<PlanoId, { nome: string; valor: string; total: string; dias: number }> = {
  mensal:    { nome: "Mensal",    valor: "R$ 49,00",  total: "R$ 49,00",  dias: 30  },
  semestral: { nome: "Semestral", valor: "R$ 234,00", total: "R$ 234,00", dias: 180 },
  anual:     { nome: "Anual",     valor: "R$ 348,00", total: "R$ 348,00", dias: 365 },
};

function PagamentoPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const planoId = useMemo<PlanoId>(() => {
    const raw = (typeof window !== "undefined"
      ? sessionStorage.getItem("motozap.plano_escolhido")
      : null) as PlanoId | null;
    return raw && PLANOS_INFO[raw] ? raw : "mensal";
  }, []);
  const plano = PLANOS_INFO[planoId];

  const qrUrl = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
        PIX_KEY,
      )}`,
    [],
  );

  useEffect(() => {
    if (!authLoading && !user) {
      toast.info("Faça login ou cadastre-se para continuar");
      navigate({ to: "/mototaxista/auth" });
    }
  }, [authLoading, user, navigate]);

  async function copiarChave() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopiado(true);
      toast.success("Chave Pix copiada!");
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente.");
    }
  }

  async function declararPagamento() {
    if (!user) return;
    setEnviando(true);
    try {
      const planoDb =
        planoId === "mensal" ? "mensal" : planoId === "semestral" ? "prata" : "ouro";

      const { error } = await supabase
        .from("mototaxistas")
        .update({
          plano: planoDb,
          pagamento_declarado: true,
          pagamento_declarado_em: new Date().toISOString(),
          status_cadastro: "aguardando_aprovacao",
        } as never)
        .eq("id", user.id);
      if (error) throw error;

      toast.success("Pagamento declarado! Aguarde a confirmação.");
      navigate({ to: "/mototaxista/foto" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao declarar pagamento");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(0,255,26,0.15), transparent 70%), radial-gradient(35% 35% at 10% 80%, rgba(0,255,26,0.07), transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-md flex flex-col gap-6">
        <header className="text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-button tracking-widest uppercase"
            style={{ borderColor: "rgba(0,255,26,0.3)", background: "rgba(0,255,26,0.06)", color: "var(--color-neon)" }}
          >
            <QrCode className="w-3.5 h-3.5" />
            Pagamento via Pix
          </span>
          <h1 className="mt-4 font-display text-3xl sm:text-4xl uppercase leading-tight">
            Pague via Pix para
            <br />
            ativar seu <span style={{ color: "var(--color-neon)" }}>plano</span>
          </h1>
        </header>

        {/* Card do plano + valor */}
        <div
          className="rounded-2xl border p-5 backdrop-blur-xl flex items-center justify-between"
          style={{
            borderColor: "rgba(0,255,26,0.35)",
            background: "linear-gradient(160deg, rgba(0,255,26,0.10), rgba(0,0,0,0.4) 60%)",
            boxShadow: "0 20px 60px -20px rgba(0,255,26,0.4)",
          }}
        >
          <div>
            <div className="text-[11px] font-button tracking-widest uppercase text-white/55">Plano escolhido</div>
            <div className="font-button text-2xl tracking-wider uppercase">{plano.nome}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-button tracking-widest uppercase text-white/55">Valor</div>
            <div className="font-display text-3xl" style={{ color: "var(--color-neon)" }}>{plano.valor}</div>
          </div>
        </div>

        {/* QR Code */}
        <div
          className="rounded-2xl border p-5 backdrop-blur-xl flex flex-col items-center gap-3"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <div className="text-[11px] font-button tracking-widest uppercase text-white/55">
            Escaneie o QR Code
          </div>
          <div className="bg-white p-3 rounded-xl">
            <img
              src={qrUrl}
              alt="QR Code Pix"
              width={220}
              height={220}
              className="block"
            />
          </div>
          <div className="text-xs text-white/60 font-sans">Beneficiário: {PIX_BENEFICIARIO}</div>
        </div>

        {/* Chave Pix copiável */}
        <div
          className="rounded-2xl border p-5 backdrop-blur-xl flex flex-col gap-3"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <div className="text-[11px] font-button tracking-widest uppercase text-white/55">
            Chave Pix
          </div>
          <div className="rounded-xl bg-black/40 border border-white/10 px-4 py-3 font-mono text-sm break-all text-white/90">
            {PIX_KEY}
          </div>
          <button
            onClick={copiarChave}
            className="btn-outline-neon w-full flex items-center justify-center gap-2"
          >
            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiado ? "CHAVE COPIADA" : "COPIAR CHAVE PIX"}
          </button>
        </div>

        {/* Instrução */}
        <div
          className="rounded-2xl border p-4 backdrop-blur-md flex items-start gap-3"
          style={{ borderColor: "rgba(0,255,26,0.2)", background: "rgba(0,255,26,0.05)" }}
        >
          <Clock className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--color-neon)" }} />
          <p className="text-sm text-white/80 font-sans leading-relaxed">
            Após pagar, toque em <strong>"Já fiz o pagamento"</strong> e aguarde a confirmação
            em até <strong>2 horas</strong>.
          </p>
        </div>

        {/* Botão declarar pagamento */}
        <button onClick={declararPagamento} className="btn-cta w-full" disabled={enviando}>
          {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
          {enviando ? "ENVIANDO..." : "JÁ FIZ O PAGAMENTO"}
        </button>

        <div className="flex items-center justify-center gap-2 text-xs text-white/55 font-sans">
          <ShieldCheck className="w-4 h-4" style={{ color: "var(--color-neon)" }} />
          Pagamento conferido manualmente pela equipe InterGO
        </div>
      </div>
    </main>
  );
}
