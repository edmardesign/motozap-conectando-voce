import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listarMunicipios,
  adminListarVizinhos,
  adminAlterarVizinho,
  type VizinhoConfig,
} from "@/lib/municipios.functions";

export const Route = createFileRoute("/_admGate/adm/municipios-permitidos")({
  component: MunicipiosPermitidosPage,
});

type Municipio = { id: string; name: string; uf: string; ibge_code: string };

function MunicipiosPermitidosPage() {
  const carregarMunicipios = useServerFn(listarMunicipios);
  const carregarVizinhos = useServerFn(adminListarVizinhos);
  const alterar = useServerFn(adminAlterarVizinho);

  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [base, setBase] = useState("");
  const [vizinhos, setVizinhos] = useState<VizinhoConfig[]>([]);
  const [novo, setNovo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const lista = await carregarMunicipios();
        setMunicipios(lista);
        if (lista[0]) setBase(lista[0].id);
      } catch (e: any) {
        toast.error(e?.message ?? "Não foi possível carregar os municípios.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregarMunicipios]);

  const recarregar = useCallback(async () => {
    if (!base) return;
    try {
      setVizinhos(await carregarVizinhos({ data: { municipio_id: base } }));
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível carregar a lista.");
    }
  }, [base, carregarVizinhos]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const disponiveis = useMemo(
    () => municipios.filter((m) => m.id !== base && !vizinhos.some((v) => v.neighbor_city_id === m.id)),
    [municipios, base, vizinhos],
  );

  async function mudar(neighborId: string, remover: boolean) {
    setSalvando(true);
    try {
      await alterar({ data: { primary_id: base, neighbor_id: neighborId, remover } });
      setNovo("");
      await recarregar();
      toast.success(remover ? "Município removido." : "Município liberado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">Municípios permitidos</h1>
        <p className="text-sm text-muted-foreground">
          Por padrão, chamadas ficam restritas ao município de exercício do servidor. Aqui você libera
          municípios vizinhos que passam a ser aceitos sem autorização especial.
        </p>
      </header>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <label className="block text-sm font-semibold text-foreground">Município base</label>
          <select
            value={base}
            onChange={(e) => setBase(e.target.value)}
            className="w-full rounded-xl bg-muted px-3 py-2 text-sm text-foreground outline-none"
          >
            {municipios.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.uf}
              </option>
            ))}
          </select>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold text-foreground">Vizinhos liberados</h2>
            {vizinhos.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum município vizinho liberado.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {vizinhos.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2 text-sm text-foreground">
                    <span>
                      {v.neighbor_name} — {v.neighbor_uf}
                    </span>
                    <button
                      disabled={salvando}
                      onClick={() => mudar(v.neighbor_city_id, true)}
                      className="rounded-full border border-border px-3 py-1 text-xs font-semibold disabled:opacity-40"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <label className="block text-sm font-semibold text-foreground">Liberar município</label>
              <select
                value={novo}
                onChange={(e) => setNovo(e.target.value)}
                className="mt-1 w-full rounded-xl bg-muted px-3 py-2 text-sm text-foreground outline-none"
              >
                <option value="">Selecione…</option>
                {disponiveis.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.uf}
                  </option>
                ))}
              </select>
            </div>
            <button
              disabled={!novo || salvando}
              onClick={() => mudar(novo, false)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              Liberar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
