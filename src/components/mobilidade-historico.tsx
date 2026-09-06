import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { minhasChamadasMobilidade } from "@/lib/cotas.functions";

type Chamada = {
  id: string;
  created_at: string;
  tipo: string;
  status: string;
  origem_endereco: string | null;
  destino_endereco: string | null;
};

const MODALIDADE: Record<string, string> = { automovel: "Automóvel", moto_taxi: "Moto Táxi" };

function rotuloMes(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/** Histórico das chamadas de mobilidade urbana do servidor, agrupado por mês. */
export function MobilidadeHistorico() {
  const buscar = useServerFn(minhasChamadasMobilidade);
  const [itens, setItens] = useState<Chamada[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await buscar();
        if (!cancel) setItens(r as Chamada[]);
      } catch {
        /* sem histórico disponível */
      } finally {
        if (!cancel) setCarregando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [buscar]);

  const grupos = useMemo(() => {
    const map = new Map<string, Chamada[]>();
    for (const c of itens) {
      const k = c.created_at.slice(0, 7);
      const arr = map.get(k) ?? [];
      arr.push(c);
      map.set(k, arr);
    }
    return Array.from(map.entries());
  }, [itens]);

  if (carregando) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#6B6B6B]">
        Chamadas de mobilidade urbana
      </h2>
      {grupos.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-[#6B6B6B]">Nenhuma chamada registrada ainda.</p>
      ) : (
        <div className="space-y-4">
          {grupos.map(([mes, lista]) => (
            <div key={mes} className="rounded-2xl bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-[#6B6B6B]">
                {rotuloMes(lista[0]!.created_at)} · {lista.length} chamada{lista.length > 1 ? "s" : ""}
              </p>
              <ul className="divide-y divide-[#F0F0F0]">
                {lista.map((c) => (
                  <li key={c.id} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{MODALIDADE[c.tipo] ?? c.tipo}</span>
                      <span className="text-xs text-[#6B6B6B]">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")} · {c.status}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-xs text-[#6B6B6B]">
                      {c.origem_endereco ?? "—"} → {c.destino_endereco ?? "—"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
