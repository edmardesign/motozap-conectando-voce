import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { adminAuditoriaMobilidade, type LinhaAuditoria } from "@/lib/mobilidade-auditoria.functions";
import { AuditoriaRotaModal } from "@/components/auditoria-rota-modal";

export const Route = createFileRoute("/_admGate/adm/mobilidade-auditoria")({
  component: AuditoriaMobilidadePage,
});

const POR_PAGINA = 25;

function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function dt(v: string | null) {
  return v ? new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
}

function AuditoriaMobilidadePage() {
  const listar = useServerFn(adminAuditoriaMobilidade);
  const carregarMunicipios = useServerFn(listarMunicipios);

  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [somenteExcecao, setSomenteExcecao] = useState(false);
  const [municipioDestino, setMunicipioDestino] = useState("");
  const [municipios, setMunicipios] = useState<Array<{ id: string; name: string; uf: string }>>([]);
  const [pagina, setPagina] = useState(0);
  const [linhas, setLinhas] = useState<LinhaAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [detalhe, setDetalhe] = useState<LinhaAuditoria | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setMunicipios(await carregarMunicipios());
      } catch {
        /* filtro opcional */
      }
    })();
  }, [carregarMunicipios]);

  const filtros = {
    inicio,
    fim,
    busca,
    status,
    somente_excecao: somenteExcecao,
    municipio_destino: municipioDestino || null,
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const rows = await listar({
        data: { ...filtros, limite: POR_PAGINA, offset: pagina * POR_PAGINA },
      });
      setLinhas(rows);
      setTotal(rows[0]?.total_registros ?? 0);
    } catch {
      toast.error("Não foi possível carregar as chamadas.");
    } finally {
      setCarregando(false);
    }
  }, [listar, inicio, fim, busca, status, somenteExcecao, municipioDestino, pagina]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function exportarCSV() {
    const rows = await listar({ data: { ...filtros, limite: 200, offset: 0 } });
    const cab = [
      "Servidor", "Cargo", "Lotação", "Modalidade", "Situação", "Solicitada", "Aceita", "Início",
      "Fim", "Origem", "Destino", "Município destino", "Autorização especial", "Perto da fronteira",
      "Distância (km)", "Duração (min)", "Motorista", "Fora do expediente",
    ];
    const corpo = rows.map((r) =>
      [r.servidor, r.cargo, r.lotacao, r.modalidade, r.status, dt(r.criada_em), dt(r.aceita_em),
       dt(r.iniciada_em), dt(r.finalizada_em), r.origem, r.destino, r.municipio_destino,
       r.com_excecao ? "Sim" : "Não", r.perto_fronteira ? "Sim" : "Não", r.distancia_km, r.duracao_min,
       r.motorista, r.fora_expediente ? "Sim" : "Não"].map(csvEscape).join(";"),
    );
    const blob = new Blob(["\uFEFF" + [cab.map(csvEscape).join(";"), ...corpo].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mobilidade-auditoria.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }


  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans text-[#111111]">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold">Auditoria — Mobilidade Urbana</h1>
        <p className="mb-6 text-sm text-[#6B6B6B]">
          Registro completo das chamadas de servidores: horários, origem, destino e rota percorrida.
        </p>

        <div className="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-5 print:hidden">
          <input value={busca} onChange={(e) => { setPagina(0); setBusca(e.target.value); }}
            placeholder="Servidor, cargo ou lotação" className="rounded-xl bg-[#F5F5F7] px-3 py-2 text-sm outline-none sm:col-span-2" />
          <input type="date" value={inicio} onChange={(e) => { setPagina(0); setInicio(e.target.value); }}
            className="rounded-xl bg-[#F5F5F7] px-3 py-2 text-sm outline-none" />
          <input type="date" value={fim} onChange={(e) => { setPagina(0); setFim(e.target.value); }}
            className="rounded-xl bg-[#F5F5F7] px-3 py-2 text-sm outline-none" />
          <select value={status} onChange={(e) => { setPagina(0); setStatus(e.target.value); }}
            className="rounded-xl bg-[#F5F5F7] px-3 py-2 text-sm outline-none">
            <option value="">Todas as situações</option>
            <option value="aguardando">Não atendida (aguardando)</option>
            <option value="aceita">Aceita</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        <div className="mb-4 flex gap-3 print:hidden">
          <button onClick={exportarCSV} className="rounded-xl bg-[#3DB54A] px-4 py-2 text-sm font-bold text-white">
            Exportar CSV
          </button>
          <button onClick={() => window.print()} className="rounded-xl border border-[#D9D9D9] px-4 py-2 text-sm font-semibold">
            Exportar PDF
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAFAFA] text-xs uppercase text-[#6B6B6B]">
              <tr>
                <th className="p-3">Servidor</th>
                <th className="p-3">Cargo / lotação</th>
                <th className="p-3">Modalidade</th>
                <th className="p-3">Solicitada</th>
                <th className="p-3">Trajeto</th>
                <th className="p-3">Situação</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr><td colSpan={7} className="p-6 text-center text-[#6B6B6B]">Carregando…</td></tr>
              )}
              {!carregando && linhas.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-[#6B6B6B]">Nenhuma chamada encontrada.</td></tr>
              )}
              {linhas.map((l) => (
                <tr key={l.id} className="border-t border-[#F0F0F0] align-top">
                  <td className="p-3 font-medium">{l.servidor ?? "—"}</td>
                  <td className="p-3 text-xs text-[#6B6B6B]">{[l.cargo, l.lotacao].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="p-3">{l.modalidade === "moto_taxi" ? "Moto táxi" : "Automóvel"}</td>
                  <td className="p-3 text-xs">
                    {dt(l.criada_em)}
                    {l.fora_expediente && (
                      <span className="mt-1 flex items-center gap-1 rounded-full bg-[#FFF8E1] px-2 py-0.5 text-[11px] font-semibold text-[#7A5B00]">
                        <AlertTriangle size={12} /> Fora do expediente
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-[#6B6B6B]">
                    <span className="line-clamp-1">{l.origem ?? "—"}</span>
                    <span className="line-clamp-1">→ {l.destino ?? "—"}</span>
                  </td>
                  <td className="p-3">{l.status}</td>
                  <td className="p-3 print:hidden">
                    <button onClick={() => setDetalhe(l)} className="rounded-lg bg-[#F5F5F7] px-3 py-1 text-xs font-semibold">
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm print:hidden">
          <span className="text-[#6B6B6B]">{total} chamada(s) · página {pagina + 1} de {totalPaginas}</span>
          <div className="flex gap-2">
            <button disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}
              className="rounded-lg border border-[#D9D9D9] px-3 py-1 disabled:opacity-40">Anterior</button>
            <button disabled={pagina + 1 >= totalPaginas} onClick={() => setPagina((p) => p + 1)}
              className="rounded-lg border border-[#D9D9D9] px-3 py-1 disabled:opacity-40">Próxima</button>
          </div>
        </div>
      </div>

      {detalhe && <AuditoriaRotaModal linha={detalhe} onClose={() => setDetalhe(null)} />}
    </div>
  );
}
