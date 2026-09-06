import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  adminListarCotas,
  adminLiberarCotaExtra,
  adminDefinirLimiteMobilidade,
  adminChamadasMobilidadeMes,
  adminPedidosLiberacao,
} from "@/lib/cotas.functions";

export const Route = createFileRoute("/_admGate/adm/quotas")({
  component: QuotasPage,
});

type Linha = {
  user_id: string;
  nome: string | null;
  cidade: string | null;
  month: string;
  limite: number;
  used: number;
  extra_granted: number;
  restantes: number;
};

type FiltroStatus = "todos" | "ok" | "proximo" | "excedido";

function mesAtualISO() {
  const agora = new Date();
  const saoPaulo = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${saoPaulo.getFullYear()}-${String(saoPaulo.getMonth() + 1).padStart(2, "0")}`;
}

function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function QuotasPage() {
  const listar = useServerFn(adminListarCotas);
  const liberar = useServerFn(adminLiberarCotaExtra);
  const definirLimite = useServerFn(adminDefinirLimiteMobilidade);
  const listarChamadas = useServerFn(adminChamadasMobilidadeMes);
  const listarPedidos = useServerFn(adminPedidosLiberacao);

  const [mes, setMes] = useState(mesAtualISO());
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("todos");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [pedidos, setPedidos] = useState<Array<{ id: string; user_id: string; reason: string; created_at: string }>>([]);

  const [alvo, setAlvo] = useState<Linha | null>(null);
  const [qtd, setQtd] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [novoLimite, setNovoLimite] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const rows = await listar({ data: { month: `${mes}-01`, busca: busca || null } });
      setLinhas(rows as Linha[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar cotas");
    } finally {
      setCarregando(false);
    }
  }, [listar, mes, busca]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    listarPedidos()
      .then((p) => setPedidos(p as typeof pedidos))
      .catch(() => setPedidos([]));
  }, [listarPedidos]);

  const filtradas = useMemo(() => {
    return linhas.filter((l) => {
      const total = l.limite + l.extra_granted;
      if (status === "excedido") return l.restantes <= 0;
      if (status === "proximo") return l.restantes > 0 && l.restantes <= 2;
      if (status === "ok") return l.restantes > 2 || total === 0;
      return true;
    });
  }, [linhas, status]);

  async function confirmarLiberacao() {
    if (!alvo) return;
    setSalvando(true);
    try {
      await liberar({ data: { user_id: alvo.user_id, amount: qtd, motivo } });
      toast.success("Chamadas extras liberadas.");
      setAlvo(null);
      setQtd(1);
      setMotivo("");
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao liberar");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarLimitePadrao() {
    const n = Number(novoLimite);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Informe um número válido");
      return;
    }
    try {
      await definirLimite({ data: { limite: n } });
      toast.success("Limite padrão atualizado (vale para os próximos meses).");
      setNovoLimite("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar limite");
    }
  }

  async function exportarCSV() {
    try {
      const rows = await listarChamadas({ data: { month: `${mes}-01` } });
      const head = ["data", "servidor", "modalidade", "status", "origem", "destino"];
      const body = (rows as Array<Record<string, unknown>>).map((r) =>
        [
          new Date(String(r.criada_em)).toLocaleString("pt-BR"),
          r.passageiro,
          r.tipo,
          r.status,
          r.origem,
          r.destino,
        ]
          .map(csvEscape)
          .join(";"),
      );
      const csv = [head.join(";"), ...body].join("\n");
      const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `mobilidade-${mes}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar");
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F5F7] p-6 text-[#111111]">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl font-bold">Cotas de Mobilidade Urbana</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          Controle de chamadas mensais por servidor. O serviço é gratuito — o limite é por quantidade.
        </p>

        <section className="mt-5 rounded-2xl bg-white p-4">
          <h2 className="text-sm font-bold uppercase text-[#6B6B6B]">Limite padrão do sistema</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={novoLimite}
              onChange={(e) => setNovoLimite(e.target.value)}
              inputMode="numeric"
              placeholder="Ex.: 10"
              className="w-32 rounded-xl bg-[#F5F5F7] px-3 py-2 outline-none"
            />
            <button onClick={salvarLimitePadrao} className="rounded-xl bg-[#3DB54A] px-4 py-2 font-semibold text-white">
              Salvar limite
            </button>
          </div>
        </section>

        {pedidos.length > 0 && (
          <section className="mt-4 rounded-2xl border border-[#F2C94C] bg-[#FFF8E1] p-4">
            <h2 className="text-sm font-bold text-[#7A5B00]">
              {pedidos.length} pedido(s) de liberação aguardando análise
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-[#7A5B00]">
              {pedidos.slice(0, 5).map((p) => (
                <li key={p.id}>
                  {new Date(p.created_at).toLocaleDateString("pt-BR")} — {p.reason || "sem motivo informado"}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-4 flex flex-wrap gap-2">
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="rounded-xl bg-white px-3 py-2 outline-none"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar servidor"
            className="flex-1 rounded-xl bg-white px-3 py-2 outline-none"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as FiltroStatus)}
            className="rounded-xl bg-white px-3 py-2 outline-none"
          >
            <option value="todos">Todos</option>
            <option value="ok">Dentro do limite</option>
            <option value="proximo">Próximo do limite</option>
            <option value="excedido">Excedido</option>
          </select>
          <button onClick={exportarCSV} className="rounded-xl border border-[#D9D9D9] bg-white px-4 py-2 font-semibold">
            Exportar CSV
          </button>
        </section>

        <section className="mt-4 overflow-x-auto rounded-2xl bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#F0F0F0] text-xs uppercase text-[#6B6B6B]">
              <tr>
                <th className="p-3">Servidor</th>
                <th className="p-3">Lotação</th>
                <th className="p-3">Uso</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td className="p-4 text-[#6B6B6B]" colSpan={4}>
                    Carregando…
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td className="p-4 text-[#6B6B6B]" colSpan={4}>
                    Nenhum servidor encontrado.
                  </td>
                </tr>
              ) : (
                filtradas.map((l) => (
                  <tr key={l.user_id} className="border-b border-[#F7F7F7]">
                    <td className="p-3 font-semibold">{l.nome ?? "—"}</td>
                    <td className="p-3 text-[#6B6B6B]">{l.cidade ?? "—"}</td>
                    <td className="p-3">
                      {l.used} de {l.limite + l.extra_granted}
                      {l.restantes <= 0 && <span className="ml-2 text-xs font-bold text-[#8A2B2B]">excedido</span>}
                      {l.restantes > 0 && l.restantes <= 2 && (
                        <span className="ml-2 text-xs font-bold text-[#7A5B00]">próximo</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setAlvo(l)}
                        className="rounded-xl bg-[#3DB54A] px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Liberar mais
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>

      {alvo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
            <h2 className="text-lg font-bold">Liberar chamadas extras</h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">{alvo.nome ?? alvo.user_id}</p>
            <input
              type="number"
              min={1}
              value={qtd}
              onChange={(e) => setQtd(Number(e.target.value))}
              className="mt-3 w-full rounded-xl bg-[#F5F5F7] px-3 py-2 outline-none"
            />
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Motivo"
              className="mt-3 w-full rounded-xl bg-[#F5F5F7] p-3 text-sm outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setAlvo(null)} className="flex-1 rounded-xl border border-[#D9D9D9] py-2 font-semibold">
                Cancelar
              </button>
              <button
                disabled={salvando}
                onClick={confirmarLiberacao}
                className="flex-1 rounded-xl bg-[#3DB54A] py-2 font-bold text-white disabled:opacity-50"
              >
                {salvando ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
