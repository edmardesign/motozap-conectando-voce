import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  isValidPhone,
  isValidPin,
  maskPhone,
  onlyDigits,
  phoneToEmail,
  pinToPassword,
} from "@/lib/phone";
import { getCidadeLocal } from "@/lib/cidade-local";
import { TermsCheckbox } from "@/components/terms-checkbox";
import { EmojiIcon } from "@/components/emoji-icon";



type Search = { next?: string };

export const Route = createFileRoute("/cadastro/passageiro")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): Search => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Cadastro — InterGO" },
      { name: "description", content: "Crie sua conta única para usar Delivery, Mercado ou Moto Táxi do InterGO" },
    ],
  }),
  component: CadastroPassageiro,
});

const TOTAL_STEPS = 5;
const BG = "#000000";
const FG = "#F5F5F5";
const ACCENT = "#00FF1A";
const CARD = "#0a0a0a";

// Steps:
// 0: nome → 1: telefone → 2: pin1 → 3: pin2 → 4: creating/success
// Cidade já foi escolhida em /cidade antes deste fluxo.



function CadastroPassageiro() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/cadastro/passageiro" }) as Search;
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [shake, setShake] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, next)));
  };
  const next = () => go(step + 1);
  const prev = () => go(step - 1);

  // Etapa 4: criar conta no Supabase
  useEffect(() => {
    if (step !== 4 || creating || created) return;

    setCreating(true);
    (async () => {
      try {
        const email = phoneToEmail(telefone);

        const password = pinToPassword(pin1);
        const cidadeSelecionada = getCidadeLocal();
        const cidadeFinal = cidadeSelecionada?.cidade ?? "";
        const estadoFinal = cidadeSelecionada?.uf ?? "";

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/splash`,
            // <EmojiIcon e="⚠️" /> Metadados sensíveis (nome/telefone/aniversario) ficam apenas no
            // trigger handle_new_user → tabela profiles (protegida por RLS).
            // Aqui só passamos o mínimo para o trigger funcionar; em seguida
            // limpamos o user_metadata para não vazar no JWT do localStorage.
            data: {
              nome: nome.trim(),
              telefone: onlyDigits(telefone),
              tipo: "passageiro",
              cidade: cidadeFinal,
              estado: estadoFinal,
            },

          },
        });
        if (error) {
          if (error.message.toLowerCase().includes("registered")) {
            toast.error("Este telefone já está cadastrado. Faça login.");
            navigate({ to: "/auth/passageiro" });
            return;
          }
          throw error;
        }
        // Limpa metadados sensíveis do JWT após o trigger popular profiles
        try {
          await supabase.auth.updateUser({ data: { tipo: "passageiro" } });
        } catch { /* não bloquear o onboarding se falhar */ }
        // Registra aceite de Termos e Privacidade no perfil
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user?.id) {
            await (supabase as any)
              .from("profiles")
              .update({
                termos_aceitos_em: new Date().toISOString(),
                termos_versao: "1.0",
              })
              .eq("id", userData.user.id);
          }
        } catch { /* noop */ }
        setCreated(true);

      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao criar conta");
        go(3); // volta para senha
      } finally {
        setCreating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Validação senha
  useEffect(() => {
    if (step === 3 && pin2.length === 4) {

      if (pin1 === pin2) {
        next();
      } else {
        setShake(true);
        setTimeout(() => {
          setPin2("");
          setShake(false);
        }, 400);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin2]);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <main
      className="fixed inset-0 overflow-hidden"
      style={{ background: BG, color: FG }}
    >
      {/* Header com voltar e indicador de etapa */}
      {step < 4 && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 pt-4">
          {step > 0 ? (
            <button
              onClick={prev}
              aria-label="Voltar"
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: FG }} />
            </button>
          ) : (
            <div className="w-10 h-10" />
          )}
          <div className="flex-1" />
          <span className="text-xs font-bold" style={{ color: FG, opacity: 0.8 }}>
            Etapa {step + 1} de {TOTAL_STEPS}
          </span>
        </div>
      )}

      {/* Barra de progresso */}
      <div className="absolute top-[52px] left-0 right-0 h-[3px] bg-white/5 z-20">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, background: ACCENT }}
        />
      </div>


      {/* Slides container */}
      <div
        className="flex h-full transition-transform duration-300 ease-in-out"
        style={{
          width: `${TOTAL_STEPS * 100}%`,
          transform: `translateX(-${step * (100 / TOTAL_STEPS)}%)`,
        }}
      >
        <Slide>
          <StepNome
            active={step === 0}
            value={nome}
            onChange={setNome}
            onAdvance={() => {
              if (nome.trim().length >= 2) next();
              else toast.error("Digite seu nome");
            }}
          />
        </Slide>
        <Slide>
          <StepTelefone
            active={step === 1}
            nome={nome}
            value={telefone}
            onChange={setTelefone}
            onComplete={next}
          />
        </Slide>
        <Slide>
          <StepPin
            active={step === 2}
            title="Crie sua senha de 4 dígitos "
            subtitle="Só você terá acesso à sua conta"
            value={pin1}
            onChange={setPin1}
            onComplete={aceitouTermos ? next : undefined}
            extra={
              <div className="mb-6">
                <TermsCheckbox checked={aceitouTermos} onChange={setAceitouTermos} accent={ACCENT} />
                {!aceitouTermos && pin1.length === 4 && (
                  <p className="text-xs mt-2 text-center" style={{ color: `${FG}99` }}>
                    Aceite os termos para continuar
                  </p>
                )}
              </div>
            }
          />
        </Slide>
        <Slide>
          <StepPin
            active={step === 3}
            title="Repita sua senha"
            subtitle="Para confirmar"
            value={pin2}
            onChange={setPin2}
            shake={shake}
          />
        </Slide>


        <Slide>
          <StepDone
            done={created}
            nome={nome}
            ctaLabel="ESCOLHER MINHA CIDADE"
            onStart={async () => {
              // Novo fluxo: cadastro → escolha de cidade → serviços da cidade.
              const { data } = await supabase.auth.getSession();
              if (data.session) navigate({ to: "/cidade" });
              else navigate({ to: "/auth/passageiro" });
            }}
          />
        </Slide>
      </div>
    </main>
  );
}

function Slide({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="h-full flex items-center justify-center px-6 overflow-y-auto"
      style={{ width: `${100 / TOTAL_STEPS}%`, flexShrink: 0 }}
    >
      <div className="w-full max-w-md py-10">{children}</div>
    </section>
  );
}

function Question({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="text-center mb-8">
      <h2 style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.3, color: FG }}>
        {children}
      </h2>
      {subtitle && (
        <p className="mt-2" style={{ fontSize: 14, color: `${FG}99` }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}


function StepNome({
  active, value, onChange, onAdvance,
}: { active: boolean; value: string; onChange: (s: string) => void; onAdvance: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active) setTimeout(() => inputRef.current?.focus(), 320);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => onAdvance(), 800);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, active, onAdvance]);

  return (
    <>
      <Question subtitle="Como vamos te chamar no app ">Qual é o seu nome?</Question>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim().length >= 2) onAdvance();
        }}
        placeholder="Digite seu nome"
        autoComplete="name"
        maxLength={80}
        className="w-full bg-transparent outline-none border-0 border-b text-center pb-2"
        style={{
          fontSize: 24, color: FG, borderColor: `${ACCENT}55`, caretColor: ACCENT,
        }}
      />
    </>
  );
}

function StepTelefone({
  active, nome, value, onChange, onComplete,
}: { active: boolean; nome: string; value: string; onChange: (s: string) => void; onComplete: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (active) setTimeout(() => inputRef.current?.focus(), 320);
  }, [active]);

  useEffect(() => {
    if (active && isValidPhone(value)) {
      const t = setTimeout(onComplete, 300);
      return () => clearTimeout(t);
    }
  }, [value, active, onComplete]);

  const primeiroNome = nome.trim().split(" ")[0] || "amigo(a)";

  return (
    <>
      <Question subtitle="Para o mototaxista entrar em contato se precisar">
        Qual é o seu telefone, {primeiroNome}?
      </Question>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(maskPhone(e.target.value))}
        placeholder="(11) 91234-5678"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={16}
        className="w-full bg-transparent outline-none border-0 border-b text-center pb-2"
        style={{ fontSize: 24, color: FG, borderColor: `${ACCENT}55`, caretColor: ACCENT }}
      />
    </>
  );
}


function StepAniversario({
  value, onChange, onAdvance, onSkip,
}: {
  value: { d: number; m: number; y: number } | null;
  onChange: (v: { d: number; m: number; y: number }) => void;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const iso = value
    ? `${value.y}-${String(value.m).padStart(2, "0")}-${String(value.d).padStart(2, "0")}`
    : "";

  // Idade em anos completos até hoje
  const idade = (() => {
    if (!value) return null;
    const b = new Date(value.y, value.m - 1, value.d);
    let a = today.getFullYear() - b.getFullYear();
    const m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) a--;
    return a;
  })();

  const futura = value ? new Date(value.y, value.m - 1, value.d) > today : false;
  const menorIdade = idade !== null && idade < 16;
  const valid = !!value && !futura && !menorIdade;

  return (
    <>
      <Question subtitle="Você ganha uma corrida grátis no seu mês — é nosso presente!">
        Quando é seu aniversário? <EmojiIcon e="🎂" />
      </Question>

      <input
        type="date"
        value={iso}
        max={todayISO}
        onChange={(e) => {
          const val = e.target.value;
          if (!val) return;
          const [y, m, d] = val.split("-").map(Number);
          if (!y || !m || !d) return;
          onChange({ d, m, y });
        }}
        className="w-full rounded-xl outline-none px-4 py-4 mb-3"
        style={{ background: CARD, color: FG, fontSize: 18 }}
      />

      {futura && (
        <p className="text-red-400 text-sm mb-3">Data inválida — não pode ser no futuro.</p>
      )}
      {menorIdade && !futura && (
        <p className="text-red-400 text-sm mb-3">
          É necessário ter pelo menos 16 anos para usar o app.
        </p>
      )}

      <button
        onClick={() => { if (valid) onAdvance(); }}
        disabled={!valid}
        className="w-full py-4 rounded-xl text-base font-semibold mb-3 disabled:opacity-40"
        style={{ background: ACCENT, color: "#000" }}
      >
        Confirmar
      </button>
    </>
  );
}

function Wheel({
  items, value, onChange,
}: { items: { value: number; label: string }[]; value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full text-center rounded-xl outline-none appearance-none py-3"
      style={{ background: CARD, color: FG, fontSize: 20 }}
    >
      {items.map((it) => (
        <option key={it.value} value={it.value} style={{ background: CARD }}>
          {it.label}
        </option>
      ))}
    </select>
  );
}

function StepPin({
  active, title, subtitle, value, onChange, onComplete, shake, extra,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  value: string;
  onChange: (s: string) => void;
  onComplete?: () => void;
  shake?: boolean;
  extra?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (active) setTimeout(() => inputRef.current?.focus(), 320);
  }, [active]);
  useEffect(() => {
    if (active && onComplete && isValidPin(value)) {
      const t = setTimeout(onComplete, 200);
      return () => clearTimeout(t);
    }
  }, [value, active, onComplete]);

  return (
    <>
      <Question subtitle={subtitle}>{title}</Question>
      {extra}
      <div
        className={`flex justify-center gap-4 mb-6 ${shake ? "animate-[shake_0.4s]" : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
            style={{
              background: CARD,
              border: value.length === i ? `2px solid ${ACCENT}` : "2px solid transparent",
              boxShadow: value.length === i ? `0 0 16px ${ACCENT}55` : "none",
            }}
          >
            {value[i] && (
              <div className="w-4 h-4 rounded-full" style={{ background: ACCENT }} />
            )}
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 4))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={4}
        className="absolute opacity-0 pointer-events-none"
        style={{ left: -9999 }}
      />
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
    </>
  );
}

function StepDone({
  done, nome, onStart, ctaLabel,
}: { done: boolean; nome: string; onStart: () => void; ctaLabel: string }) {
  const primeiroNome = nome.trim().split(" ")[0];
  if (!done) {
    return (
      <div className="text-center flex flex-col items-center gap-5">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: ACCENT }} />
        <p style={{ fontSize: 22, fontWeight: 300, color: FG }}>Criando sua conta...</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="text-5xl"><EmojiIcon e="🎉" /></div>
      <h2 style={{ fontSize: 26, fontWeight: 400, color: FG }}>
        {primeiroNome}, seja bem-vindo(a)!
      </h2>

      <button
        onClick={onStart}
        className="w-full py-4 rounded-2xl font-bold"
        style={{ background: ACCENT, color: "#000", fontSize: 15 }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
