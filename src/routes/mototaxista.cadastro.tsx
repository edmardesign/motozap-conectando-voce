import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatarPlaca, formatarTelefone, formatarCpf } from "@/utils/formatters";
import {
  isValidPhone,
  isValidPin,
  maskPhone,
  onlyDigits,
  phoneToEmail,
  pinToPassword,
} from "@/lib/phone";
import { TermsCheckbox } from "@/components/terms-checkbox";
import { EmojiIcon } from "@/components/emoji-icon";

export const Route = createFileRoute("/mototaxista/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro de Mototaxista" },
      {
        name: "description",
        content: "Crie sua conta de mototaxista no InterGO em poucos passos.",
      },
    ],
  }),
  component: MototaxistaCadastroWizard,
});

const COLORS = {
  bg: "#FFFFFF",
  panel: "#1A2C33",
  neon: "#3DB54A",
  neonText: "#FFFFFF",
  text: "#F5F5F5",
};

const STORAGE_KEY = "moto_wizard_v2";

const CORES_MOTO = [
  "Preta", "Branca", "Vermelha", "Azul", "Cinza", "Prata", "Verde", "Amarela", "Outra",
] as const;

// ---------------- CPF ----------------
function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function isValidCPF(raw: string) {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === parseInt(cpf.charAt(10));
}

// ---------------- Placa ----------------
function maskPlaca(v: string) {
  const s = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (s.length > 4 && /[A-Z]/.test(s[4])) return s.slice(0, 7);
  if (s.length <= 3) return s;
  return `${s.slice(0, 3)}-${s.slice(3, 7)}`;
}
function isValidPlaca(v: string) {
  const s = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{3}\d{4}$/.test(s) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(s);
}

// ---------------- Wizard state ----------------
type WizardData = {
  nome: string;
  telefone: string;
  cpf: string;
  modelo: string;
  ano: string;
  placa: string;
  cor: string;
  cnh: string;
};

const emptyData: WizardData = {
  nome: "",
  telefone: "",
  cpf: "",
  modelo: "",
  ano: "",
  placa: "",
  cor: "",
  cnh: "",
};

const TOTAL_STEPS = 7;

function MototaxistaCadastroWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [data, setData] = useState<WizardData>(emptyData);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.data) setData({ ...emptyData, ...saved.data });
        if (saved.step && typeof saved.step === "number") {
          setStep(Math.min(saved.step, TOTAL_STEPS));
        }
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
  }, [step, data]);

  const update = useCallback((patch: Partial<WizardData>) => {
    setData((d) => ({ ...d, ...patch }));
  }, []);

  const goNext = useCallback(() => {
    setDirection("forward");
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);
  const goBack = useCallback(() => {
    setDirection("back");
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1: return data.nome.trim().length >= 2;
      case 2: return isValidCPF(data.cpf);
      case 3: return isValidPhone(data.telefone);
      case 4: return onlyDigits(data.cnh).length === 11;
      case 5:
        return (
          data.modelo.trim().length > 1 &&
          /^\d{4}$/.test(data.ano) &&
          isValidPlaca(data.placa) &&
          !!data.cor
        );
      case 6:
        return isValidPin(pin) && pin === pinConfirm && aceitouTermos;
      case 7: return true;
      default: return false;
    }
  }, [step, data, pin, pinConfirm, aceitouTermos]);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const email = phoneToEmail(data.telefone);
      const password = pinToPassword(pin);

      const { data: signUp, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/splash`,
          data: {
            nome: data.nome.trim(),
            telefone: onlyDigits(data.telefone),
          },
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("registered")) {
          toast.error("Este telefone já está cadastrado. Faça login.");
          navigate({ to: "/mototaxista/auth" });
          return;
        }
        toast.error(error.message);
        return;
      }

      const userId = signUp.user?.id;
      if (userId) {
        const { error: cadastroError } = await (supabase as any).rpc(
          "mototaxista_finalizar_cadastro",
          {
            _cpf: onlyDigits(data.cpf),
            _modelo_moto: data.modelo.trim(),
            _ano_moto: Number(data.ano),
            _placa_moto: data.placa.toUpperCase(),
            _cor_moto: data.cor,
            _numero_cnh: onlyDigits(data.cnh),
            _termos_versao: "1.0",
          },
        );

        if (cadastroError) {
          toast.error(cadastroError.message);
          return;
        }
      }

      localStorage.removeItem(STORAGE_KEY);
      toast.success("Cadastro recebido. Acesso liberado após confirmação.");
      navigate({ to: "/mototaxista/aguardando" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: COLORS.bg, color: COLORS.text }}
    >
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        {step > 1 ? (
          <button
            onClick={goBack}
            className="text-sm text-muted-foreground hover:text-foreground px-2 py-1"
            disabled={submitting}
          >
            ← Voltar
          </button>
        ) : (
          <button
            onClick={() => navigate({ to: "/mototaxista/auth" })}
            className="text-sm text-muted-foreground hover:text-foreground px-2 py-1"
          >
            ← Voltar
          </button>
        )}
        <div className="flex-1" />
        <span className="text-xs font-bold text-foreground/80">
          {step} de {TOTAL_STEPS}
        </span>
      </header>
      <div className="px-4">
        <div
          className="h-2.5 w-full rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(61, 181, 74,0.25)" }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(step / TOTAL_STEPS) * 100}%`,
              background: COLORS.neon,
              boxShadow: "0 0 12px rgba(61, 181, 74,0.7)",
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <StepSlide key={step} direction={direction}>
          {step === 1 && (
            <StepWrapper title="Qual é o seu nome?" subtitle="Assim você aparece para os passageiros">
              <NeonInput
                autoFocus
                value={data.nome}
                onChange={(v) => update({ nome: v })}
                placeholder="Nome completo"
                autoComplete="name"
                maxLength={80}
              />
            </StepWrapper>
          )}
          {step === 2 && (
            <StepWrapper title="Qual é o seu CPF?" subtitle="Necessário para sua segurança">
              <NeonInput
                autoFocus
                value={data.cpf}
                onChange={(v) => update({ cpf: maskCPF(v) })}
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
              />
              {data.cpf.length === 14 && !isValidCPF(data.cpf) && (
                <p className="text-red-400 text-sm mt-2">CPF inválido. Verifique os dígitos.</p>
              )}
            </StepWrapper>
          )}
          {step === 3 && (
            <StepWrapper title="Qual é o seu telefone?" subtitle="Para os passageiros entrarem em contato">
              <NeonInput
                autoFocus
                value={data.telefone}
                onChange={(v) => update({ telefone: maskPhone(v) })}
                placeholder="(11) 91234-5678"
                inputMode="tel"
                maxLength={16}
              />
            </StepWrapper>
          )}
          {step === 4 && (
            <StepWrapper title="Sua CNH" subtitle="Informe o número da sua CNH">
              <NeonInput
                autoFocus
                value={data.cnh}
                onChange={(v) => update({ cnh: onlyDigits(v).slice(0, 11) })}
                placeholder="00000000000"
                inputMode="numeric"
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground mt-3">
                <EmojiIcon e="🔒" /> Seus dados são protegidos e nunca compartilhados com terceiros.
              </p>
            </StepWrapper>
          )}
          {step === 5 && <StepMoto data={data} update={update} />}
          {step === 6 && (
            <StepWrapper title="Crie sua senha" subtitle="Só você terá acesso à sua conta">
              <div className="flex flex-col gap-5">
                <PinField label="Senha de 4 dígitos" value={pin} onChange={setPin} autoFocus />
                <PinField label="Confirmar senha" value={pinConfirm} onChange={setPinConfirm} />
                {pinConfirm.length === 4 && pin !== pinConfirm && (
                  <p className="text-red-400 text-sm text-center">As senhas não coincidem</p>
                )}
                <div className="pt-2 border-t border-white/10">
                  <TermsCheckbox checked={aceitouTermos} onChange={setAceitouTermos} accent={COLORS.neon} />
                </div>
              </div>
            </StepWrapper>
          )}
          {step === 7 && <StepResumo data={data} />}
        </StepSlide>
      </div>

      <footer className="px-4 pb-6 pt-3">
        <button
          onClick={step === TOTAL_STEPS ? handleSubmit : goNext}
          disabled={!canContinue || submitting}
          className="w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition disabled:opacity-40"
          style={{ background: COLORS.neon, color: COLORS.neonText }}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {step === TOTAL_STEPS ? "CONFIRMAR CADASTRO" : "Próximo"}
        </button>
      </footer>
    </main>
  );
}

function StepSlide({
  children, direction,
}: { children: React.ReactNode; direction: "forward" | "back" }) {
  return (
    <div
      key={direction}
      className="absolute inset-0 px-6 py-6 overflow-y-auto"
      style={{
        animation: `${direction === "forward" ? "slideInRight" : "slideInLeft"} 220ms ease-out`,
      }}
    >
      {children}
      <style>{`
        @keyframes slideInRight { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInLeft { from { transform: translateX(-40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

function StepWrapper({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto flex flex-col gap-5 pt-2">
      <div>
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function NeonInput({
  value, onChange, onBlur, placeholder, autoFocus, inputMode, maxLength, autoComplete,
}: {
  value: string; onChange: (v: string) => void; onBlur?: () => void;
  placeholder?: string; autoFocus?: boolean;
  inputMode?: "text" | "tel" | "numeric" | "email";
  maxLength?: number; autoComplete?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => ref.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);
  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      inputMode={inputMode}
      maxLength={maxLength}
      autoComplete={autoComplete}
      className="w-full bg-transparent border-2 rounded-xl px-4 py-3.5 text-base outline-none transition-colors focus:border-[var(--neon-on)] border-white/20 placeholder:text-foreground/40"
      style={{ color: COLORS.text, ["--neon-on" as any]: COLORS.neon } as React.CSSProperties}
    />
  );
}

function StepMoto({
  data, update,
}: { data: WizardData; update: (p: Partial<WizardData>) => void }) {
  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: anoAtual - 1999 }, (_, i) => anoAtual - i);
  return (
    <StepWrapper title="Qual é a sua moto?" subtitle="Modelo, ano, placa e cor">
      <div className="flex flex-col gap-3">
        <NeonInput
          autoFocus
          value={data.modelo}
          onChange={(v) => update({ modelo: v })}
          placeholder="Modelo (ex: Honda CG 160)"
          maxLength={60}
        />
        <select
          value={data.ano}
          onChange={(e) => update({ ano: e.target.value })}
          className="w-full bg-transparent border-2 border-white/20 rounded-xl px-4 py-3.5 text-base outline-none focus:border-[#00FF00]"
          style={{ color: COLORS.text }}
        >
          <option value="" style={{ color: "#FFFFFF" }}>Ano da moto</option>
          {anos.map((a) => (
            <option key={a} value={String(a)} style={{ color: "#FFFFFF" }}>{a}</option>
          ))}
        </select>
        <NeonInput
          value={data.placa}
          onChange={(v) => update({ placa: maskPlaca(v) })}
          placeholder="Placa (AAA-0000 ou AAA0A00)"
          maxLength={8}
        />
        {data.placa.length >= 7 && !isValidPlaca(data.placa) && (
          <p className="text-red-400 text-sm">Placa inválida.</p>
        )}

        <div className="mt-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
            Cor da moto
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CORES_MOTO.map((c) => {
              const active = data.cor === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => update({ cor: c })}
                  className={`py-2.5 rounded-lg border font-semibold text-sm transition ${
                    active
                      ? "bg-[#3DB54A] text-black border-[#3DB54A]"
                      : "bg-white/5 text-foreground border-white/10 hover:border-white/30"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </StepWrapper>
  );
}

function PinField({
  label, value, onChange, autoFocus,
}: { label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => ref.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2 text-center">{label}</p>
      <div className="relative" onClick={() => ref.current?.focus()}>
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 4))}
          inputMode="numeric"
          maxLength={4}
          className="absolute opacity-0 inset-0 w-full h-full"
        />
        <div className="flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl font-bold transition-all"
              style={{
                borderColor: value.length === i ? COLORS.neon : "rgba(255,255,255,0.2)",
                background: value.length > i ? COLORS.neon : "transparent",
                color: COLORS.neonText,
              }}
            >
              {value.length > i ? "•" : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepResumo({ data }: { data: WizardData }) {
  return (
    <StepWrapper title="Tudo certo!" subtitle="Confirme seus dados">
      <div
        className="rounded-2xl p-5 flex flex-col gap-3 text-sm"
        style={{ background: COLORS.panel, border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <ResumoRow label="Nome" value={data.nome} />
        <ResumoRow label="CPF" value={formatarCpf(data.cpf)} />
        <ResumoRow label="WhatsApp" value={formatarTelefone(data.telefone)} />
        <ResumoRow label="CNH" value={data.cnh} />
        <ResumoRow
          label="Moto"
          value={`${data.modelo} ${data.ano} — ${formatarPlaca(data.placa)} (${data.cor})`}
        />
      </div>
    </StepWrapper>
  );
}

function ResumoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
