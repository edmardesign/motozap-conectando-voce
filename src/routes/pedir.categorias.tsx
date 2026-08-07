import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { CATEGORIAS_TODAS, CATEGORIA_CORES } from "@/lib/pedir/categorias";

export const Route = createFileRoute("/pedir/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias do delivery — Bora Zé!" },
      { name: "description", content: "Veja todas as categorias de delivery disponíveis no Bora Zé!: restaurantes, pizza, lanches, mercado, farmácias e mais." },
      { property: "og:title", content: "Categorias do delivery — Bora Zé!" },
      { property: "og:description", content: "Todas as categorias de delivery disponíveis na sua cidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Categorias,
});

/** Normaliza texto removendo acentos para busca tolerante. */
function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function Categorias() {
  const [busca, setBusca] = useState("");

  const lista = useMemo(() => {
    const termo = normalizar(busca);
    if (!termo) return CATEGORIAS_TODAS;
    return CATEGORIAS_TODAS.filter((c) => normalizar(c.label).includes(termo));
  }, [busca]);

  return (
    <div style={{ background: "var(--dz-surface-2)", minHeight: "100dvh" }}>
      <header
        className="sticky top-0 z-30 px-3 pt-3 pb-2"
        style={{ background: "var(--dz-surface-2)" }}
      >
        <div className="flex items-center gap-2">
          <Link
            to="/pedir"
            aria-label="Voltar"
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center"
            style={{ background: "var(--dz-surface)", boxShadow: "var(--dz-shadow-1)" }}
          >
            <ArrowLeft size={18} color="var(--dz-ink)" />
          </Link>
          <h1 className="truncate text-[16px] font-black text-[color:var(--dz-ink)]">
            Todas as categorias
          </h1>
        </div>

        <div className="relative mt-3">
          <Search
            size={18}
            color="var(--dz-muted)"
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar categoria"
            aria-label="Buscar categoria"
            className="dz-input"
            style={{ background: "var(--dz-surface)", boxShadow: "var(--dz-shadow-1)" }}
          />
        </div>
      </header>

      <main className="px-3 pb-6">
        {lista.length === 0 ? (
          <p className="dz-body text-center py-10">Nenhuma categoria encontrada.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {lista.map((c, i) => (
              <Link
                key={`${c.id}-${c.label}`}
                to="/pedir/buscar"
                className="relative overflow-hidden flex items-center transition-transform active:scale-[0.97]"
                style={{
                  background: CATEGORIA_CORES[i % CATEGORIA_CORES.length],
                  borderRadius: 14,
                  minHeight: 84,
                  paddingLeft: 12,
                  paddingRight: 4,
                }}
              >
                <span
                  className="relative z-10 text-[14px] font-extrabold leading-tight"
                  style={{ color: "#FFFFFF", maxWidth: "58%" }}
                >
                  {c.label}
                </span>
                <img
                  src={c.img}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  width={512}
                  height={512}
                  className="absolute right-0 bottom-0 object-contain"
                  style={{ width: 92, height: 84 }}
                />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
