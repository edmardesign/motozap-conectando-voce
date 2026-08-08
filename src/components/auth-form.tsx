import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  isValidPhone,
  isValidPin,
  maskPhone,
  onlyDigits,
  phoneToEmail,
  pinToPassword,
} from "@/lib/phone";
import { LocationPicker } from "@/components/location-picker";
import { AddressFields, emptyAddress, type AddressValue } from "@/components/address-fields";
import { geocodeFull } from "@/lib/geocoding";

type Role = "passageiro" | "mototaxista";
type Mode = "login" | "signup";

interface Props {
  role: Role;
  title: string;
  redirectTo: string;
  /** "both" (default) shows tabs; "login" or "signup" locks the form. */
  formMode?: "both" | "login" | "signup";
  /** When formMode="login", clicking "Cadastre-se" navigates here. */
  signupRedirectTo?: string;
  /** Override the submit button label. */
  submitLabel?: string;
}


export function AuthForm({ role, title, redirectTo, formMode = "both", signupRedirectTo, submitLabel }: Props) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(formMode === "signup" ? "signup" : "login");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [pin, setPin] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [loc, setLoc] = useState({ estado: "", cidade: "" });
  const [endereco, setEndereco] = useState<AddressValue>(emptyAddress);
  const [cidadeOk, setCidadeOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isSignup = mode === "signup";
  const requirePhoto = role === "mototaxista" && isSignup;
  const requireConfigured = role === "mototaxista";

  function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem deve ter no máximo 5MB");
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!isValidPhone(telefone)) return toast.error("Telefone inválido. Use (XX) XXXXX-XXXX");
    if (!isValidPin(pin)) return toast.error("Senha deve ter 4 dígitos numéricos");
    if (isSignup) {
      if (nome.trim().length < 2) return toast.error("Informe seu nome completo");
      if (!loc.estado || !loc.cidade) return toast.error("Selecione estado e cidade");
      if (requireConfigured && !cidadeOk) {
        return toast.error("Sua cidade ainda não está disponível para mototaxistas");
      }
      if (!endereco.rua.trim() || !endereco.numero.trim() || !endereco.bairro.trim()) {
        return toast.error("Informe rua, número e bairro");
      }
    }
    if (requirePhoto && !fotoFile) return toast.error("Envie uma foto para confirmar o cadastro");

    setLoading(true);
    try {
      const email = phoneToEmail(telefone);
      const password = pinToPassword(pin);

      if (isSignup) {
        // Garante geocoding antes de salvar (caso usuário não tenha disparado o onBlur)
        let lat = endereco.latitude;
        let lng = endereco.longitude;
        if (lat == null || lng == null) {
          const hit = await geocodeFull({
            rua: endereco.rua, numero: endereco.numero, bairro: endereco.bairro,
            cidade: loc.cidade, estado: loc.estado,
          });
          if (hit) { lat = Number(hit.lat); lng = Number(hit.lon); }
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/splash`,
            data: {
              nome: nome.trim(),
              telefone: onlyDigits(telefone),
              tipo: role,
              estado: loc.estado,
              cidade: loc.cidade,
              endereco_rua: endereco.rua.trim(),
              endereco_numero: endereco.numero.trim(),
              endereco_bairro: endereco.bairro.trim(),
              endereco_complemento: endereco.complemento.trim() || null,
              latitude: lat != null ? String(lat) : "",
              longitude: lng != null ? String(lng) : "",
            },
          },
        });
        if (error) {
          if (error.message.toLowerCase().includes("registered")) {
            toast.error("Este telefone já está cadastrado. Faça login.");
            setMode("login");
          } else toast.error(error.message);
          return;
        }

        const userId = data.user?.id;
        if (requirePhoto && fotoFile && userId) {
          const ext = fotoFile.name.split(".").pop() ?? "jpg";
          const path = `${userId}/perfil.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("fotos-mototaxistas")
            .upload(path, fotoFile, { upsert: true, contentType: fotoFile.type });
          if (upErr) toast.error(`Falha ao enviar foto: ${upErr.message}`);
          else await supabase.from("profiles").update({ foto_url: path }).eq("id", userId);
        }

        try {
          const key = role === "mototaxista" ? "boraze.moto.lastPhone" : "boraze.pax.lastPhone";
          localStorage.setItem(key, onlyDigits(telefone));
        } catch {}
        toast.success("Conta criada!");
        navigate({ to: redirectTo });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return toast.error("Telefone ou senha inválido");
      try {
        const key = role === "mototaxista" ? "boraze.moto.lastPhone" : "boraze.pax.lastPhone";
        localStorage.setItem(key, onlyDigits(telefone));
      } catch {}
      toast.success("Bem-vindo de volta!");
      navigate({ to: redirectTo });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="card-mz p-8 max-w-md w-full text-center flex flex-col gap-4">
          <div className="text-5xl">⏳</div>
          <h1 className="text-2xl font-bold">Cadastro recebido</h1>
          <p className="text-foreground/80">
            Acesso liberado após confirmação do administrador. Você receberá uma notificação quando
            sua conta for aprovada.
          </p>
          <button className="btn-cta" onClick={() => navigate({ to: "/splash" })}>
            Voltar ao início
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10 flex flex-col items-center">
      <div className="card-mz p-7 max-w-md w-full flex flex-col gap-5">
        <header className="text-center">
          <h1 className="text-2xl font-bold" style={{ textShadow: "none" }}>{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSignup ? "Crie sua conta com telefone e senha" : "Entre com telefone e senha"}
          </p>
        </header>

        {(formMode === "both" || (formMode === "login" && signupRedirectTo)) && (
          <div className="flex gap-2 bg-background/20 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode("login")}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition"
              style={!isSignup ? { background: "var(--color-neon)", color: "var(--color-neon-foreground)" } : { color: "rgba(255,255,255,0.7)" }}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                if (formMode === "login" && signupRedirectTo) {
                  navigate({ to: signupRedirectTo as never });
                } else {
                  setMode("signup");
                }
              }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Cadastrar
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {isSignup && (
            <>
              <LocationPicker
                value={loc}
                onChange={setLoc}
                requireConfigured={requireConfigured}
                onConfiguredChange={setCidadeOk}
              />

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Nome completo</span>
                <input
                  className="input-mz"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                  maxLength={80}
                />
              </label>

              {loc.estado && loc.cidade && (
                <AddressFields
                  value={endereco}
                  onChange={setEndereco}
                  cidade={loc.cidade}
                  estado={loc.estado}
                />
              )}
            </>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Telefone</span>
            <input
              className="input-mz"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(11) 91234-5678"
              inputMode="tel"
              autoComplete="tel"
              maxLength={16}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Senha de 4 dígitos</span>
            <input
              className="input-mz tracking-[0.5em] text-center text-lg"
              value={pin}
              onChange={(e) => setPin(onlyDigits(e.target.value).slice(0, 4))}
              placeholder="••••"
              inputMode="numeric"
              autoComplete={isSignup ? "new-password" : "current-password"}
              maxLength={4}
            />
          </label>

          {requirePhoto && (
            <label className="flex flex-col items-center gap-3 p-4 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/5">
              {fotoPreview ? (
                <img
                  src={fotoPreview}
                  alt="Sua foto"
                  className="w-28 h-28 rounded-full object-cover border-4"
                  style={{ borderColor: "var(--color-neon)" }}
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-background/30 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm text-foreground/80">
                {fotoPreview ? "Trocar foto" : "Enviar foto de perfil (obrigatório)"}
              </span>
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhoto} />
            </label>
          )}

          <button type="submit" className="btn-cta" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitLabel ?? (isSignup ? "Cadastrar" : "Entrar")}
          </button>
        </form>

      </div>
    </main>
  );
}
