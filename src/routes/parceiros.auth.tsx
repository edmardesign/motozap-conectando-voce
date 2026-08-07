import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isValidPhone, isValidPin, maskPhone, onlyDigits, pinToPassword } from "@/lib/phone";
import { empresaPhoneToEmail } from "@/lib/empresa";

export const Route = createFileRoute("/parceiros/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Parceiros Bora Zé!" },
      { name: "description", content: "Acesse o painel de parceiro Bora Zé!" },
    ],
  }),
  component: ParceirosAuth,
});

function ParceirosAuth() {
  const navigate = useNavigate();
  const [telefone, setTelefone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!isValidPhone(telefone)) return toast.error("Telefone inválido");
    if (!isValidPin(pin)) return toast.error("Senha deve ter 4 dígitos");

    setLoading(true);
    try {
      const email = empresaPhoneToEmail(telefone);
      const password = pinToPassword(pin);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return toast.error("Telefone ou senha inválido");

      const db = supabase as any;
      const { data: link } = await db.from("empresa_auth").select("empresa_id").maybeSingle();
      if (!link) {
        await supabase.auth.signOut();
        return toast.error("Esta conta não está vinculada a um parceiro");
      }
      toast.success("Bem-vindo!");
      navigate({ to: "/parceiros/painel" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10 flex flex-col items-center">
      <div className="p-7 max-w-md w-full flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5">
        <header className="text-center">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Anton, sans-serif" }}>
            PARCEIROS BORA ZÉ!
          </h1>
          <p className="text-white/70 text-sm mt-1">Entrar com telefone e senha</p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Telefone</span>
            <input
              className="rounded-lg bg-black/40 border border-white/10 px-4 py-3 focus:outline-none focus:border-[#00FF1A]"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(11) 91234-5678"
              inputMode="tel"
              maxLength={16}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Senha de 4 dígitos</span>
            <input
              className="rounded-lg bg-black/40 border border-white/10 px-4 py-3 focus:outline-none focus:border-[#00FF1A] tracking-[0.5em] text-center text-lg"
              value={pin}
              onChange={(e) => setPin(onlyDigits(e.target.value).slice(0, 4))}
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg px-6 py-3 font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "#00FF1A", fontFamily: "Bebas Neue, sans-serif", fontSize: "1.15rem" }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            ENTRAR
          </button>
        </form>

        <div className="flex flex-col gap-2 pt-3 border-t border-white/10 text-center">
          <Link to="/food/esqueci-pin" className="text-sm text-[#00FF1A] hover:underline">
            Esqueci meu PIN
          </Link>
          <Link to="/parceiros/cadastro" className="text-sm text-white/70 hover:text-white">
            Ainda não tem conta? <span className="text-[#00FF1A] font-semibold">Cadastre-se</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
