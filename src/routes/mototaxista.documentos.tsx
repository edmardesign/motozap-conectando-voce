import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/mototaxista/documentos")({
  component: MeusDocumentos,
});

type StatusDoc =
  | "nao_enviado"
  | "enviado"
  | "em_analise"
  | "aprovado"
  | "rejeitado";

type Doc = {
  tipo_documento: "cnh_frente" | "cnh_verso";
  status: StatusDoc;
  versao: number;
  enviado_em: string | null;
  analisado_em: string | null;
  motivo_rejeicao: string | null;
  storage_path: string | null;
};

const TIPOS: Array<{ id: "cnh_frente" | "cnh_verso"; label: string; hint: string }> = [
  { id: "cnh_frente", label: "CNH — Frente", hint: "Foto legível da frente da sua CNH" },
  { id: "cnh_verso", label: "CNH — Verso", hint: "Foto legível do verso da sua CNH" },
];

const BADGE: Record<StatusDoc, { text: string; bg: string; fg: string }> = {
  nao_enviado: { text: "Não enviado", bg: "#222", fg: "#bbb" },
  enviado: { text: "Enviado", bg: "#1a3a5b", fg: "#8ac6ff" },
  em_analise: { text: "Em análise", bg: "#4a3a10", fg: "#ffd47a" },
  aprovado: { text: "Aprovado", bg: "#123a1c", fg: "#5cff9a" },
  rejeitado: { text: "Rejeitado", bg: "#4a1414", fg: "#ff8a8a" },
};

function MeusDocumentos() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Record<string, Doc>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/mototaxista" });
  }, [user, authLoading, navigate]);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("mototaxista_meus_documentos");
    if (error) {
      toast.error("Falha ao carregar documentos");
      setLoading(false);
      return;
    }
    const map: Record<string, Doc> = {};
    (data ?? []).forEach((d: any) => (map[d.tipo_documento] = d));
    setDocs(map);

    // signed URLs para preview
    const urls: Record<string, string> = {};
    await Promise.all(
      (data ?? []).map(async (d: any) => {
        if (!d.storage_path) return;
        const { data: signed } = await supabase.storage
          .from("mototaxistas-documentos")
          .createSignedUrl(d.storage_path, 300);
        if (signed?.signedUrl) urls[d.tipo_documento] = signed.signedUrl;
      })
    );
    setPreviewUrls(urls);
    setLoading(false);
  };

  useEffect(() => {
    if (user) void carregar();
  }, [user]);

  const enviar = async (tipo: "cnh_frente" | "cnh_verso", file: File) => {
    if (!user) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 8MB)");
      return;
    }
    if (!/^image\//.test(file.type) && file.type !== "application/pdf") {
      toast.error("Envie uma imagem (JPG/PNG) ou PDF");
      return;
    }
    setUploadingTipo(tipo);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${tipo}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("mototaxistas-documentos")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { error: rpcErr } = await supabase.rpc("mototaxista_registrar_documento", {
        _tipo: tipo,
        _storage_path: path,
        _content_type: file.type,
        _tamanho_bytes: file.size,
      });
      if (rpcErr) throw rpcErr;

      toast.success("Documento enviado! Aguarde análise.");
      await carregar();
    } catch (e: any) {
      toast.error(e?.message || "Falha no envio");
    } finally {
      setUploadingTipo(null);
    }
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#FFFFFF",
        color: "#111111",
        padding: "calc(env(safe-area-inset-top,0px) + 20px) 20px 40px",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Link
            to="/mototaxista/home"
            style={{
              color: "#3DB54A",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            ← Voltar
          </Link>
        </header>

        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px" }}>
          Meus documentos
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 4 }}>
          O envio da CNH ainda não é obrigatório para operar, mas você já pode
          enviá-la para agilizar sua análise.
        </p>

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {TIPOS.map((t) => {
            const doc = docs[t.id];
            const status: StatusDoc = doc?.status ?? "nao_enviado";
            const badge = BADGE[status];
            const isUploading = uploadingTipo === t.id;

            return (
              <section
                key={t.id}
                style={{
                  background: "#111",
                  border: "1px solid #222",
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 800 }}>{t.label}</h2>
                    <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>{t.hint}</p>
                  </div>
                  <span
                    style={{
                      background: badge.bg,
                      color: badge.fg,
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {badge.text}
                  </span>
                </div>

                {previewUrls[t.id] && (
                  <div style={{ marginTop: 12 }}>
                    <img
                      src={previewUrls[t.id]}
                      alt={t.label}
                      style={{
                        width: "100%",
                        maxHeight: 220,
                        objectFit: "cover",
                        borderRadius: 12,
                        border: "1px solid #333",
                      }}
                    />
                  </div>
                )}

                {status === "rejeitado" && doc?.motivo_rejeicao && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 10,
                      background: "rgba(224,72,72,0.1)",
                      border: "1px solid rgba(224,72,72,0.3)",
                      borderRadius: 10,
                      color: "#ff8a8a",
                      fontSize: 13,
                    }}
                  >
                    <strong>Motivo:</strong> {doc.motivo_rejeicao}
                  </div>
                )}

                <input
                  ref={(el) => { inputRefs.current[t.id] = el; }}
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void enviar(t.id, f);
                    e.target.value = "";
                  }}
                />
                <button
                  disabled={isUploading || loading}
                  onClick={() => inputRefs.current[t.id]?.click()}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: status === "aprovado" ? "#F7F7F7" : "#3DB54A",
                    color: status === "aprovado" ? "#3DB54A" : "#FFFFFF",
                    border: status === "aprovado" ? "1px solid #3DB54A" : "none",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    opacity: isUploading ? 0.6 : 1,
                  }}
                >
                  {isUploading
                    ? "Enviando..."
                    : status === "nao_enviado"
                    ? "Enviar arquivo"
                    : status === "aprovado"
                    ? "Reenviar (opcional)"
                    : "Substituir arquivo"}
                </button>
              </section>
            );
          })}
        </div>

        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 24, textAlign: "center" }}>
          Seus documentos são privados. Apenas você e a equipe autorizada do InterGO
          podem visualizá-los.
        </p>
      </div>
    </main>
  );
}
