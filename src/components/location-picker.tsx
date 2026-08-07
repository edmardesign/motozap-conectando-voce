import { useEffect, useMemo, useState } from "react";
import { ESTADOS_BR, SUPORTE_WHATSAPP, fetchMunicipiosIBGE } from "@/lib/estados-br";
import { supabase } from "@/integrations/supabase/client";
import { EmojiIcon } from "@/components/emoji-icon";

type Value = { estado: string; cidade: string };

interface Props {
  value: Value;
  onChange: (v: Value) => void;
  requireConfigured?: boolean;
  /** Quando true → permite qualquer cidade (sem checagem) */
  allowAny?: boolean;
  onConfiguredChange?: (ok: boolean) => void;
}

export function LocationPicker({
  value,
  onChange,
  requireConfigured = false,
  allowAny = false,
  onConfiguredChange,
}: Props) {
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [configurada, setConfigurada] = useState<boolean | null>(null);

  // Carrega municípios quando estado muda
  useEffect(() => {
    if (!value.estado) {
      setMunicipios([]);
      return;
    }
    setLoading(true);
    fetchMunicipiosIBGE(value.estado)
      .then(setMunicipios)
      .catch(() => setMunicipios([]))
      .finally(() => setLoading(false));
  }, [value.estado]);

  // Checa se cidade está configurada
  useEffect(() => {
    if (!requireConfigured || !value.estado || !value.cidade) {
      setConfigurada(null);
      onConfiguredChange?.(allowAny);
      return;
    }
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("cidades_configuradas" as any)
        .select("id")
        .eq("estado", value.estado)
        .ilike("cidade", value.cidade)
        .eq("ativa", true)
        .maybeSingle();
      if (cancel) return;
      const ok = !!data;
      setConfigurada(ok);
      onConfiguredChange?.(ok);
    })();
    return () => {
      cancel = true;
    };
  }, [value.estado, value.cidade, requireConfigured, allowAny, onConfiguredChange]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return municipios.slice(0, 200);
    const b = busca.toLowerCase();
    return municipios.filter((m) => m.toLowerCase().includes(b)).slice(0, 200);
  }, [municipios, busca]);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Estado</span>
        <select
          className="input-mz"
          value={value.estado}
          onChange={(e) => onChange({ estado: e.target.value, cidade: "" })}
        >
          <option value="">Selecione o estado</option>
          {ESTADOS_BR.map((e) => (
            <option key={e.uf} value={e.uf}>
              {e.uf} — {e.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Cidade</span>
        <input
          className="input-mz"
          placeholder={value.estado ? (loading ? "Carregando..." : "Buscar cidade") : "Escolha o estado primeiro"}
          value={busca || value.cidade}
          disabled={!value.estado || loading}
          onChange={(e) => {
            setBusca(e.target.value);
            if (value.cidade) onChange({ ...value, cidade: "" });
          }}
        />
        {value.estado && busca && filtrados.length > 0 && !value.cidade && (
          <div className="max-h-48 overflow-auto rounded-lg bg-black/40 border border-white/10 mt-1">
            {filtrados.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => {
                  onChange({ ...value, cidade: m });
                  setBusca("");
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-white/10"
              >
                {m}
              </button>
            ))}
          </div>
        )}
        {value.cidade && (
          <div className="text-xs text-white/60 mt-1">
            Selecionada: <strong>{value.cidade}</strong> ·{" "}
            <button type="button" className="underline" onClick={() => onChange({ ...value, cidade: "" })}>
              trocar
            </button>
          </div>
        )}
      </label>

      {requireConfigured && value.cidade && configurada === false && (
        <div className="rounded-lg p-3 bg-yellow-500/10 border border-yellow-500/30 text-sm space-y-2">
          <div>
            <EmojiIcon e="⚠️" /> Sua cidade ainda não está disponível no Bora Zé!. Entre em contato pelo WhatsApp para solicitar.
          </div>
          <a
            href={`https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent(
              `Olá, quero solicitar o Bora Zé! para ${value.cidade}/${value.estado}.`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="btn-cta inline-block !py-2 text-sm"
          >
            <EmojiIcon e="💬" /> Solicitar pelo WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
