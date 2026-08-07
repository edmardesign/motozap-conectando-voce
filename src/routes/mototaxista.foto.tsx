import { useEffect, useState, type ChangeEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/mototaxista/foto")({
  head: () => ({
    meta: [
      { title: "Foto de perfil — Bora Zé!" },
      { name: "description", content: "Envie sua foto para finalizar o cadastro de mototaxista." },
    ],
  }),
  component: FotoPage,
});

function FotoPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.info("Faça login ou cadastre-se para continuar");
      navigate({ to: "/mototaxista/auth" });
    }
  }, [authLoading, user, navigate]);

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (f.size > 5 * 1024 * 1024) return toast.error("Máximo 5MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function salvar() {
    if (!user) return;
    if (!file) return toast.error("Envie uma foto");
    setSaving(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/perfil.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("fotos-mototaxistas")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { error: pErr } = await supabase
        .from("profiles")
        .update({ foto_url: path })
        .eq("id", user.id);
      if (pErr) throw pErr;

      const { error: mErr } = await supabase
        .from("mototaxistas")
        .update({ status_cadastro: "aguardando_aprovacao" })
        .eq("id", user.id);
      if (mErr) throw mErr;

      sessionStorage.removeItem("motozap.plano_escolhido");
      toast.success("Foto enviada! Aguardando aprovação.");
      navigate({ to: "/mototaxista/aguardando" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-white px-6 py-10 flex flex-col items-center">
      <div className="card-mz p-7 max-w-md w-full flex flex-col gap-5">
        <header className="text-center">
          <h1 className="text-2xl font-bold">Sua foto de perfil</h1>
          <p className="text-white/70 text-sm mt-1">
            Os passageiros precisam ver quem vai atendê-los
          </p>
        </header>

        <label className="flex flex-col items-center gap-3 p-4 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/5">
          {preview ? (
            <img
              src={preview}
              alt="Sua foto"
              className="w-36 h-36 rounded-full object-cover border-4"
              style={{ borderColor: "var(--color-neon)" }}
            />
          ) : (
            <div className="w-36 h-36 rounded-full bg-black/30 flex items-center justify-center">
              <Upload className="w-10 h-10 text-white/60" />
            </div>
          )}
          <span className="text-sm text-white/80">
            {preview ? "Trocar foto" : "Tirar ou selecionar foto"}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={onPick}
          />
        </label>

        <button onClick={salvar} className="btn-cta" disabled={saving || !file}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Finalizar cadastro
        </button>
      </div>
    </main>
  );
}
