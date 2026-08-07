import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SUPORTE_WHATSAPP } from "@/lib/estados-br";
import { EmojiIcon } from "@/components/emoji-icon";

export const Route = createFileRoute("/mototaxista/aguardando")({
  head: () => ({
    meta: [
      { title: "Bem-vindo ao InterGO" },
      { name: "description", content: "Seu cadastro foi recebido e está em análise." },
    ],
  }),
  component: AguardandoPage,
});

function AguardandoPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [aprovado, setAprovado] = useState(false);
  const [nome, setNome] = useState<string>("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth/mototaxista" });
      return;
    }

    let cancelled = false;

    async function check() {
      const [{ data: m }, { data: p }] = await Promise.all([
        supabase
          .from("mototaxistas")
          .select("mensalidade_ativa, status_cadastro")
          .eq("id", user!.id)
          .maybeSingle(),
        supabase.from("profiles").select("nome").eq("id", user!.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (p?.nome) setNome(p.nome.split(" ")[0]);
      if (m?.mensalidade_ativa) {
        setAprovado(true);
        setTimeout(() => navigate({ to: "/mototaxista/home" }), 1500);
      }
    }
    check();

    const channel = supabase
      .channel(`moto-aprovacao-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mototaxistas", filter: `id=eq.${user.id}` },
        (payload) => {
          const novo = payload.new as { mensalidade_ativa?: boolean };
          if (novo.mensalidade_ativa) {
            setAprovado(true);
            setTimeout(() => navigate({ to: "/mototaxista/home" }), 1500);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, loading, navigate]);

  return (
    <main className="min-h-screen bg-background text-white flex items-center justify-center px-6 py-8">
      <div className="card-mz p-8 max-w-md w-full text-center flex flex-col items-center gap-5">
        {aprovado ? (
          <>
            <div className="text-6xl"><EmojiIcon e="✅" /></div>
            <h1 className="text-2xl font-bold">Cadastro aprovado!</h1>
            <p className="text-white/70 text-sm">Redirecionando para o painel...</p>
          </>
        ) : (
          <>
            <div className="text-5xl"><EmojiIcon e="🎉" /></div>
            <h1 className="text-2xl font-bold">
              Bem-vindo ao InterGO{nome ? `, ${nome}` : ""}!
            </h1>
            <p className="text-white/80 text-sm leading-relaxed">
              Seu cadastro foi recebido e seu primeiro mês é por nossa conta. <EmojiIcon e="🏍️" />
              <br />
              <br />
              Assim que aprovarmos seu perfil você já pode começar a receber corridas.
              Normalmente aprovamos em até 24 horas.
            </p>

            <div className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2 text-left text-sm">
              <div><EmojiIcon e="✅" /> Cadastro enviado</div>
              <div><EmojiIcon e="✅" /> 1 mês grátis garantido</div>
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Aguardando aprovação
              </div>
            </div>

            <a
              href={`https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent(
                "Olá! Acabei de me cadastrar no InterGO e gostaria de tirar uma dúvida.",
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 rounded-xl font-bold"
              style={{ background: "var(--color-neon)", color: "var(--color-neon-foreground)" }}
            >
              <EmojiIcon e="💬" /> Dúvidas? Fale conosco
            </a>
          </>
        )}
      </div>
    </main>
  );
}
