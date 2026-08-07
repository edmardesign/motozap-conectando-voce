import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmojiIcon } from "@/components/emoji-icon";

export type ChatCorridaProps = {
  corridaId: string;
  meuId: string;
  meuTipo: "passageiro" | "mototaxista";
  outro: {
    nome: string;
    foto_url?: string | null;
    telefone?: string | null;
    estrelas?: number | null;
    status?: string | null; // "Chegando em 3 min"
  };
  onClose: () => void;
  onReportar?: () => void;
};

type Msg = {
  id: string;
  corrida_id: string;
  remetente_id: string;
  remetente_tipo: "passageiro" | "mototaxista" | "sistema";
  texto: string | null;
  anexo_url: string | null;
  criada_em: string;
};

const QUICK_MOTO = ["Já cheguei", "Estou a caminho", "Estou perto", "Chegando em 2min"];
const QUICK_PAX = ["Tô no portão", "Já desci", "Demora só 1 min", "Cadê você?"];

// Regex: CPF (11 dígitos com/sem máscara), 16 dígitos seguidos (cartão), chave Pix aleatória (UUID)
const BLOCK_PATTERNS = [
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, // CPF
  /\b(?:\d[\s.-]?){16}\b/,            // cartão 16 dígitos
  /\b[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}\b/i, // Pix aleatória UUID
];

function contemDadoSensivel(t: string): boolean {
  return BLOCK_PATTERNS.some((r) => r.test(t));
}

export function ChatCorrida({
  corridaId, meuId, meuTipo, outro, onClose, onReportar,
}: ChatCorridaProps) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("mensagens_corrida" as any)
        .select("id,corrida_id,remetente_id,remetente_tipo,texto,anexo_url,criada_em")
        .eq("corrida_id", corridaId)
        .order("criada_em", { ascending: true });
      if (!cancel && data) setMsgs(data as unknown as Msg[]);
    })();

    const ch = supabase
      .channel(`chat-${corridaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens_corrida", filter: `corrida_id=eq.${corridaId}` },
        (payload) => {
          setMsgs((prev) => {
            const nova = payload.new as Msg;
            if (prev.some((m) => m.id === nova.id)) return prev;
            return [...prev, nova];
          });
        },
      )
      .subscribe();

    return () => { cancel = true; supabase.removeChannel(ch); };
  }, [corridaId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  async function enviar(textoMsg: string, anexoPath?: string | null) {
    const t = textoMsg.trim();
    if (!t && !anexoPath) return;
    if (t && contemDadoSensivel(t)) {
      toast.error("Por segurança, esse dado foi bloqueado.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("mensagens_corrida" as any).insert({
      corrida_id: corridaId,
      remetente_id: meuId,
      remetente_tipo: meuTipo,
      texto: t || null,
      anexo_url: anexoPath ?? null,
    });
    setSending(false);
    if (error) return toast.error("Falha ao enviar: " + error.message);
    setTexto("");
  }

  async function anexarFoto(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${corridaId}/${meuId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-corrida-anexos").upload(path, f, {
      contentType: f.type || "image/jpeg",
    });
    if (error) return toast.error("Falha no upload: " + error.message);
    const { data } = await supabase.storage.from("chat-corrida-anexos").createSignedUrl(path, 60 * 60 * 24);
    await enviar("", data?.signedUrl ?? path);
  }

  const quicks = meuTipo === "mototaxista" ? QUICK_MOTO : QUICK_PAX;
  const telefoneLimpo = (outro.telefone || "").replace(/\D/g, "");

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#0B141A" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={onClose} className="text-white text-2xl leading-none">←</button>
        {outro.foto_url ? (
          <img src={outro.foto_url} className="w-10 h-10 rounded-full object-cover" alt="" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: "#2A3942" }}><EmojiIcon e="🧑" /></div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white truncate">{outro.nome}</div>
          <div className="text-[12px] text-white/60 truncate">
            {outro.estrelas != null && `${outro.estrelas.toFixed(1)}`}
            {outro.estrelas != null && outro.status && " · "}
            {outro.status}
          </div>
        </div>
        {telefoneLimpo && (
          <a href={`tel:+55${telefoneLimpo}`} className="text-white text-xl px-2" aria-label="Ligar"><EmojiIcon e="📞" /></a>
        )}
        <button onClick={() => setMenuOpen((v) => !v)} className="text-white text-xl px-2" aria-label="Mais">⋮</button>
        {menuOpen && (
          <div className="absolute right-3 top-14 rounded-lg py-1 shadow-lg" style={{ background: "#202C33", minWidth: 160 }}>
            <button
              onClick={() => { setMenuOpen(false); onReportar?.(); }}
              className="block w-full text-left px-4 py-2 text-white hover:bg-white/5"
            ><EmojiIcon e="🚨" /> Reportar</button>
          </div>
        )}
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2" style={{ background: "#0B141A" }}>
        {msgs.length === 0 && (
          <div className="text-center text-white/40 text-[13px] mt-8">
            Sem mensagens ainda. Diga oi <EmojiIcon e="👋" />
          </div>
        )}
        {msgs.map((m) => {
          const meu = m.remetente_id === meuId;
          const sistema = m.remetente_tipo === "sistema";
          if (sistema) {
            return (
              <div key={m.id} className="text-center text-[12px] text-white/50 py-1">
                {m.texto}
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${meu ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[75%] rounded-2xl px-3 py-2 text-[14px]"
                style={{
                  background: meu ? "#005C4B" : "#202C33",
                  color: "#fff",
                  borderTopRightRadius: meu ? 4 : 16,
                  borderTopLeftRadius: meu ? 16 : 4,
                }}
              >
                {m.anexo_url && (
                  <a href={m.anexo_url} target="_blank" rel="noreferrer">
                    <img src={m.anexo_url} alt="anexo" className="rounded-lg max-h-60 mb-1" />
                  </a>
                )}
                {m.texto && <div className="whitespace-pre-wrap break-words">{m.texto}</div>}
                <div className="text-[10px] text-white/50 text-right mt-1">
                  {new Date(m.criada_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mensagens rápidas */}
      <div className="px-2 py-2 flex gap-2 overflow-x-auto border-t border-white/5" style={{ background: "#111B21" }}>
        {quicks.map((q) => (
          <button
            key={q}
            onClick={() => enviar(q)}
            disabled={sending}
            className="whitespace-nowrap px-3 py-1.5 rounded-full text-[13px] text-white disabled:opacity-50"
            style={{ background: "#2A3942" }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="px-3 py-2 flex items-end gap-2" style={{ background: "#111B21" }}>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-white text-xl p-2"
          aria-label="Anexar foto"
        ><EmojiIcon e="📎" /></button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) anexarFoto(f);
            e.target.value = "";
          }}
        />
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(texto); }
          }}
          rows={1}
          placeholder="Mensagem"
          className="flex-1 resize-none rounded-2xl px-4 py-2 text-white outline-none max-h-32"
          style={{ background: "#2A3942" }}
        />
        <button
          onClick={() => enviar(texto)}
          disabled={sending || !texto.trim()}
          className="rounded-full w-11 h-11 flex items-center justify-center disabled:opacity-40"
          style={{ background: "#00A884" }}
          aria-label="Enviar"
        >
          <span style={{ color: "#000", fontSize: 20 }}><EmojiIcon e="➤" /></span>
        </button>
      </div>
    </div>
  );
}

/** Botão flutuante para abrir o chat */
export function ChatFab({ onClick, badge }: { onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
      style={{ background: "#00A884", boxShadow: "0 8px 24px rgba(0,168,132,0.45)" }}
      aria-label="Chat"
    >
      <span style={{ fontSize: 24 }}><EmojiIcon e="💬" /></span>
      {badge != null && badge > 0 && (
        <span
          className="absolute -top-1 -right-1 text-[11px] font-bold rounded-full px-1.5 py-0.5"
          style={{ background: "#FF3B30", color: "#fff", minWidth: 20, textAlign: "center" }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
