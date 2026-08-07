// Modal reutilizável para criar/editar cidades (Rodada 2.C).
// Substitui window.prompt em _admGate.adm.gestao.tsx.

import { useEffect, useState } from "react";

export type CidadeModalMode = "criar" | "editar" | "transferir";

export type CidadeModalProps = {
  open: boolean;
  mode: CidadeModalMode;
  initial?: { cidade?: string; estado?: string };
  cidades?: { id: string; cidade: string; estado: string }[];
  onCancel: () => void;
  onConfirm: (
    val: { cidade: string; estado: string } | { cidade_id: string },
  ) => Promise<void> | void;
};

export function CidadeModal({
  open,
  mode,
  initial,
  cidades,
  onCancel,
  onConfirm,
}: CidadeModalProps) {
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cidadeSel, setCidadeSel] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCidade(initial?.cidade ?? "");
      setEstado(initial?.estado ?? "");
      setCidadeSel("");
      setErro(null);
    }
  }, [open, initial]);

  if (!open) return null;
  const titulo =
    mode === "criar" ? "Nova cidade" : mode === "editar" ? "Editar cidade" : "Transferir para cidade";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (mode === "transferir") {
      if (!cidadeSel) return setErro("Selecione uma cidade.");
      setBusy(true);
      try {
        await onConfirm({ cidade_id: cidadeSel });
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro");
      } finally {
        setBusy(false);
      }
      return;
    }
    const c = cidade.trim();
    const uf = estado.trim().toUpperCase();
    if (c.length < 2) return setErro("Nome da cidade inválido.");
    if (!/^[A-Z]{2}$/.test(uf)) return setErro("UF deve ter 2 letras.");
    setBusy(true);
    try {
      await onConfirm({ cidade: c, estado: uf });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cidade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-xl"
      >
        <h3
          id="cidade-modal-title"
          className="mb-3 text-lg font-semibold text-white"
        >
          {titulo}
        </h3>
        {mode === "transferir" ? (
          <label className="block">
            <span className="text-xs text-neutral-400">Cidade</span>
            <select
              value={cidadeSel}
              onChange={(e) => setCidadeSel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
            >
              <option value="">— selecionar —</option>
              {(cidades ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cidade} · {c.estado}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-neutral-400">Nome da cidade</span>
              <input
                autoFocus
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
                placeholder="Ex: Recife"
              />
            </label>
            <label className="block">
              <span className="text-xs text-neutral-400">UF</span>
              <input
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                className="mt-1 w-24 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm uppercase text-white"
                placeholder="PE"
              />
            </label>
          </div>
        )}
        {erro && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {erro}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#3DB54A] px-3 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Salvando…" : "Confirmar"}
          </button>
        </div>
      </form>
    </div>
  );
}
