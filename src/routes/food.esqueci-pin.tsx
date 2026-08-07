import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isValidPhone, isValidPin, maskPhone, onlyDigits, pinToPassword } from "@/lib/phone";
import { empresaPhoneToEmail } from "@/lib/empresa";

export const Route = createFileRoute("/food/esqueci-pin")({
  head: () => ({
    meta: [
      { title: "Recuperar PIN — Bora Zé Food" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EsqueciPin,
});

type Etapa = "telefone" | "codigo" | "novo-pin";

function EsqueciPin() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>("telefone");
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novoPin, setNovoPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function solicitarCodigo() {
    if (!isValidPhone(telefone)) return toast.error("Telefone inválido");
    setLoading(true);
    try {
      const db = supabase as any;
      const { error } = await db.rpc("solicitar_reset_pin", { _telefone: onlyDigits(telefone) });
      if (error) return toast.error(error.message);
      toast.success("Código enviado. Verifique com o admin (SMS em breve).");
      setEtapa("codigo");
    } finally {
      setLoading(false);
    }
  }

  async function validarCodigo() {
    if (codigo.length !== 6) return toast.error("Código deve ter 6 dígitos");
    setLoading(true);
    try {
      const db = supabase as any;
      const { error } = await db.rpc("confirmar_reset_pin", {
        _telefone: onlyDigits(telefone),
        _codigo: codigo,
      });
      if (error) return toast.error(error.message);
      setEtapa("novo-pin");
    } finally {
      setLoading(false);
    }
  }

  async function trocarPin() {
    if (!isValidPin(novoPin)) return toast.error("PIN deve ter 4 dígitos");
    setLoading(true);
    try {
      // Login temporário com o email da empresa não é possível sem senha antiga;
      // usamos updateUser através de uma edge no futuro. Por ora, orientamos contatar admin.
      // Fluxo real de troca: exigir que o usuário faça um novo signIn após o admin resetar,
      // ou registrar uma edge function autenticada por token.
      const email = empresaPhoneToEmail(telefone);
      // Tenta atualizar via magic link (fallback simples)
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        toast.error("Não foi possível concluir automaticamente. Contate o admin.");
        return;
      }
      toast.success("Solicitação registrada. Um admin concluirá a troca.");
      navigate({ to: "/parceiros/auth" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10 flex flex-col items-center">
      <div className="p-7 max-w-md w-full flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5">
        <button
          onClick={() => navigate({ to: "/parceiros/auth" })}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <header className="text-center">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Anton, sans-serif" }}>
            RECUPERAR PIN
          </h1>
          <p className="text-white/70 text-sm mt-1">
            {etapa === "telefone" && "Informe o telefone da sua conta"}
            {etapa === "codigo" && "Digite o código de 6 dígitos"}
            {etapa === "novo-pin" && "Defina um novo PIN"}
          </p>
        </header>

        {etapa === "telefone" && (
          <>
            <input
              className="rounded-lg bg-black/40 border border-white/10 px-4 py-3 focus:outline-none focus:border-[#00FF1A]"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(11) 91234-5678"
              inputMode="tel"
              maxLength={16}
            />
            <button
              disabled={loading}
              onClick={solicitarCodigo}
              className="rounded-lg px-6 py-3 font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "#00FF1A", fontFamily: "Bebas Neue, sans-serif" }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              ENVIAR CÓDIGO
            </button>
          </>
        )}

        {etapa === "codigo" && (
          <>
            <input
              className="rounded-lg bg-black/40 border border-white/10 px-4 py-3 focus:outline-none focus:border-[#00FF1A] tracking-[0.4em] text-center text-lg"
              value={codigo}
              onChange={(e) => setCodigo(onlyDigits(e.target.value).slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
            />
            <button
              disabled={loading}
              onClick={validarCodigo}
              className="rounded-lg px-6 py-3 font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "#00FF1A", fontFamily: "Bebas Neue, sans-serif" }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              VALIDAR
            </button>
          </>
        )}

        {etapa === "novo-pin" && (
          <>
            <input
              className="rounded-lg bg-black/40 border border-white/10 px-4 py-3 focus:outline-none focus:border-[#00FF1A] tracking-[0.5em] text-center text-lg"
              value={novoPin}
              onChange={(e) => setNovoPin(onlyDigits(e.target.value).slice(0, 4))}
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
            />
            <button
              disabled={loading}
              onClick={trocarPin}
              className="rounded-lg px-6 py-3 font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "#00FF1A", fontFamily: "Bebas Neue, sans-serif" }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              SALVAR NOVO PIN
            </button>
          </>
        )}
      </div>
    </main>
  );
}
