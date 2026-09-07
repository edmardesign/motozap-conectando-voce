import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adminListarExcecoes, adminDecidirExcecao, type ExcecaoAdmin } from "@/lib/municipios.functions";

export const Route = createFileRoute("/_admGate/adm/excecoes")({
  component: ExcecoesPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Recusada",
};

function dt(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function ExcecoesPage() {
  const listar = useServerFn(adminListarExcecoes);
  const decidir = useServerFn(adminDecidirExcecao);

  const [status, setStatus] = useState<string>("pending");
  const [linhas, setLinhas] = useState<ExcecaoAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await listar({ data: { status: status === "todos" ? null : status } });
      setLinhas(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível carregar os pedidos.");
    } finally {
      setCarregando(false);
    }
  }, [listar, status]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function responder(id: string, aprovar: boolean) {
    setSalvandoId(id);
    try {
      await decidir({ data: { id, aprovar, notas: notas[id] ?? "" } });
      toast.success(aprovar ? "Autorização concedida." : "Pedido recusado.");
      await carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível registrar a decisão.");
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">Autorizações de deslocamento</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos de servidores para chamadas fora do município de exercício. A autorização vale para uma
          chamada na data informada.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {["pending", "approved", "rejected", "todos"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              status === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {s === "todos" ? "Todos" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pedido nesta situação.</p>
      ) : (
        <ul className="space-y-3">
          {linhas.map((l) => (
            <li key={l.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{l.servidor ?? "Servidor"}</p>
                  <p className="text-xs text-muted-foreground">
                    {[l.cargo, l.lotacao].filter(Boolean).join(" · ") || "Cargo/lotação não informados"}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {STATUS_LABEL[l.status]}
                </span>
              </div>

              <dl className="mt-3 grid gap-1 text-sm text-foreground sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Destino</dt>
                  <dd>
                    {l.cidade} — {l.uf}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Data prevista</dt>
                  <dd>{new Date(`${l.requested_date}T12:00:00`).toLocaleDateString("pt-BR")}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Motivo</dt>
                  <dd className="whitespace-pre-wrap">{l.reason}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Solicitado em</dt>
                  <dd>{dt(l.criada_em)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Uso</dt>
                  <dd>{l.consumed_at ? `Utilizada em ${dt(l.consumed_at)}` : "Não utilizada"}</dd>
                </div>
              </dl>

              {l.status === "pending" ? (
                <div className="mt-3 space-y-2">
                  <input
                    value={notas[l.id] ?? ""}
                    onChange={(e) => setNotas((p) => ({ ...p, [l.id]: e.target.value }))}
                    placeholder="Observação (opcional)"
                    maxLength={500}
                    className="w-full rounded-xl bg-muted px-3 py-2 text-sm text-foreground outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={salvandoId === l.id}
                      onClick={() => responder(l.id, true)}
                      className="flex-1 rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
                    >
                      Aprovar
                    </button>
                    <button
                      disabled={salvandoId === l.id}
                      onClick={() => responder(l.id, false)}
                      className="flex-1 rounded-xl border border-border py-2 text-sm font-semibold text-foreground disabled:opacity-40"
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              ) : (
                l.notes && <p className="mt-3 text-xs text-muted-foreground">Observação: {l.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
