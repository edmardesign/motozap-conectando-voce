import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isValidPhone, isValidPin, maskPhone, onlyDigits, pinToPassword } from "@/lib/phone";
import { empresaPhoneToEmail } from "@/lib/empresa";
import { AddressFields, emptyAddress, type AddressValue } from "@/components/address-fields";
import { LocationPicker } from "@/components/location-picker";
import { geocodeFull } from "@/lib/geocoding";

export const Route = createFileRoute("/parceiros/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro — Parceiros Bora Zé!" },
      { name: "description", content: "Cadastre seu estabelecimento como parceiro Bora Zé!" },
    ],
  }),
  component: ParceirosCadastro,
});

const STORAGE_KEY = "parceiros.cadastro.wizard";

interface WizardData {
  nome: string;
  telefone: string;
  loc: { estado: string; cidade: string };
  endereco: AddressValue;
  pin: string;
  pinConfirm: string;
}

const empty: WizardData = {
  nome: "", telefone: "", loc: { estado: "", cidade: "" },
  endereco: emptyAddress, pin: "", pinConfirm: "",
};

function ParceirosCadastro() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(empty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData({ ...empty, ...JSON.parse(raw) });
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  const steps = [
    "Nome do estabelecimento", "Telefone", "Localização",
    "Endereço", "Crie seu PIN", "Confirme o PIN", "Revisar e enviar",
  ];
  const progress = ((step + 1) / steps.length) * 100;

  const canNext = (): boolean => {
    switch (step) {
      case 0: return data.nome.trim().length >= 2;
      case 1: return isValidPhone(data.telefone);
      case 2: return !!(data.loc.estado && data.loc.cidade);
      case 3: return !!(data.endereco.rua && data.endereco.numero && data.endereco.bairro);
      case 4: return isValidPin(data.pin);
      case 5: return data.pin === data.pinConfirm;
      default: return true;
    }
  };

  function next() { if (canNext() && step < steps.length - 1) setStep(step + 1); }
  function prev() { if (step > 0) setStep(step - 1); }

  async function enviar() {
    if (loading) return;
    setLoading(true);
    try {
      const email = empresaPhoneToEmail(data.telefone);
      const password = pinToPassword(data.pin);
      const db = supabase as any;

      let lat = data.endereco.latitude;
      let lng = data.endereco.longitude;
      if (lat == null || lng == null) {
        const hit = await geocodeFull({
          rua: data.endereco.rua, numero: data.endereco.numero, bairro: data.endereco.bairro,
          cidade: data.loc.cidade, estado: data.loc.estado,
        });
        if (hit) { lat = Number(hit.lat); lng = Number(hit.lon); }
      }

      const enderecoStr = `${data.endereco.rua}, ${data.endereco.numero}, ${data.endereco.bairro} — ${data.loc.cidade}/${data.loc.estado}`;

      const { data: signUp, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/parceiros/painel`,
          data: {
            nome: data.nome.trim(),
            telefone: onlyDigits(data.telefone),
            tipo: "passageiro",
            estado: data.loc.estado,
            cidade: data.loc.cidade,
            endereco_rua: data.endereco.rua,
            endereco_numero: data.endereco.numero,
            endereco_bairro: data.endereco.bairro,
            endereco_complemento: data.endereco.complemento || null,
            latitude: lat != null ? String(lat) : "",
            longitude: lng != null ? String(lng) : "",
          },
        },
      });
      if (authErr) {
        if (authErr.message.toLowerCase().includes("registered")) {
          toast.error("Telefone já cadastrado. Faça login.");
          navigate({ to: "/parceiros/auth" });
        } else toast.error(authErr.message);
        return;
      }
      if (!signUp.user?.id) return toast.error("Falha no cadastro");

      const { error: rpcErr } = await db.rpc("cadastrar_empresa", {
        _nome: data.nome.trim(),
        _telefone: onlyDigits(data.telefone),
        _responsavel: null,
        _endereco: enderecoStr,
        _endereco_rua: data.endereco.rua,
        _endereco_numero: data.endereco.numero,
        _endereco_bairro: data.endereco.bairro,
        _endereco_complemento: data.endereco.complemento || null,
        _latitude: lat,
        _longitude: lng,
        _email: email,
        _tipo_negocio: "delivery",
      });
      if (rpcErr) return toast.error(`Falha ao criar estabelecimento: ${rpcErr.message}`);

      localStorage.removeItem(STORAGE_KEY);
      toast.success("Cadastro concluído!");
      navigate({ to: "/parceiros/painel" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-white flex flex-col" style={{ background: "#000000" }}>
      <div className="w-full h-[2px] bg-white/10">
        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: "#00FF1A" }} />
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        {step > 0 && (
          <button onClick={prev} className="p-2 rounded-full hover:bg-white/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <span className="text-xs text-white/50 uppercase tracking-wider" style={{ fontFamily: "Bebas Neue" }}>
          Passo {step + 1} de {steps.length}
        </span>
      </div>

      <div className="flex-1 px-6 py-4 flex flex-col gap-6 max-w-md w-full mx-auto">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "Anton, sans-serif" }}>
          {steps[step].toUpperCase()}
        </h1>

        {step === 0 && (
          <input
            autoFocus
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-lg focus:outline-none focus:border-[#00FF1A]"
            value={data.nome}
            onChange={(e) => setData({ ...data, nome: e.target.value })}
            placeholder="Ex.: Pizzaria do Zé"
            maxLength={80}
          />
        )}
        {step === 1 && (
          <input
            autoFocus
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-lg focus:outline-none focus:border-[#00FF1A]"
            value={data.telefone}
            onChange={(e) => setData({ ...data, telefone: maskPhone(e.target.value) })}
            placeholder="(11) 91234-5678"
            inputMode="tel"
            maxLength={16}
          />
        )}
        {step === 2 && (
          <LocationPicker value={data.loc} onChange={(loc) => setData({ ...data, loc })} />
        )}
        {step === 3 && (
          <AddressFields
            value={data.endereco}
            onChange={(endereco) => setData({ ...data, endereco })}
            cidade={data.loc.cidade}
            estado={data.loc.estado}
          />
        )}
        {step === 4 && (
          <>
            <p className="text-white/60 text-sm -mt-4">Use este PIN para entrar no app.</p>
            <input
              autoFocus
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-4 tracking-[0.6em] text-center text-2xl focus:outline-none focus:border-[#00FF1A]"
              value={data.pin}
              onChange={(e) => setData({ ...data, pin: onlyDigits(e.target.value).slice(0, 4) })}
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
            />
          </>
        )}
        {step === 5 && (
          <input
            autoFocus
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-4 tracking-[0.6em] text-center text-2xl focus:outline-none focus:border-[#00FF1A]"
            value={data.pinConfirm}
            onChange={(e) => setData({ ...data, pinConfirm: onlyDigits(e.target.value).slice(0, 4) })}
            placeholder="••••"
            inputMode="numeric"
            maxLength={4}
          />
        )}
        {step === 6 && (
          <div className="flex flex-col gap-3 rounded-lg bg-white/5 border border-white/10 p-4 text-sm">
            <Row label="Estabelecimento" value={data.nome} />
            <Row label="Telefone" value={data.telefone} />
            <Row label="Cidade" value={`${data.loc.cidade}/${data.loc.estado}`} />
            <Row label="Endereço" value={`${data.endereco.rua}, ${data.endereco.numero} — ${data.endereco.bairro}`} />
            <Row label="PIN" value="••••" />
          </div>
        )}

        <div className="mt-auto pb-8">
          {step < steps.length - 1 ? (
            <button
              onClick={next}
              disabled={!canNext()}
              className="w-full rounded-lg px-6 py-4 font-bold text-black disabled:opacity-30"
              style={{ background: "#00FF1A", fontFamily: "Bebas Neue, sans-serif", fontSize: "1.25rem" }}
            >
              CONTINUAR
            </button>
          ) : (
            <button
              onClick={enviar}
              disabled={loading}
              className="w-full rounded-lg px-6 py-4 font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "#00FF1A", fontFamily: "Bebas Neue, sans-serif", fontSize: "1.25rem" }}
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              CONFIRMAR CADASTRO
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-white/50">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
