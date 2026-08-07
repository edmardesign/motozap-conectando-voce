import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { fetchMunicipiosIBGE } from "@/lib/estados-br";
import { getCidadeLocal, setCidadeLocal } from "@/lib/cidade-local";
import { salvarCidadeNoPerfil } from "@/lib/cidade-perfil";
import { supabase } from "@/integrations/supabase/client";
import { EmojiIcon } from "@/components/emoji-icon";
import logoMz from "@/assets/boraze-full-anim.png.asset.json";

type Search = { next?: string };

export const Route = createFileRoute("/cidade/")({
  ssr: false,
  // A escolha de cidade acontece DEPOIS do cadastro → exige sessão.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/cadastro/passageiro" });
  },
  head: () => ({
    meta: [
      { title: "Escolha sua cidade — InterGO" },
      {
        name: "description",
        content:
          "Selecione sua cidade na Bahia para começar a usar o InterGO — mototáxi e delivery na palma da mão.",
      },
      { property: "og:title", content: "Escolha sua cidade — InterGO" },
      {
        property: "og:description",
        content: "Selecione sua cidade na Bahia para começar a usar o InterGO",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  component: EscolherCidade,
});

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function EscolherCidade() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/cidade/" }) as Search;
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const atual = typeof window !== "undefined" ? getCidadeLocal() : null;

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetchMunicipiosIBGE("BA")
      .then((list) => {
        if (!cancel) setMunicipios(list);
      })
      .catch(() => {
        if (!cancel) setMunicipios([]);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return municipios;
    const q = normalize(busca);
    return municipios.filter((m) => normalize(m).includes(q));
  }, [municipios, busca]);

  async function escolher(cidade: string) {
    setSalvando(true);
    setCidadeLocal("BA", cidade);
    // Persiste também no perfil (best-effort, não bloqueia a navegação).
    await salvarCidadeNoPerfil("BA", cidade);
    const next =
      search?.next && search.next.startsWith("/") ? search.next : "/passageiro/home";
    navigate({ to: next, replace: true });
  }

  return (
    <main className="min-h-screen bg-background text-white flex flex-col">
      <div className="w-full max-w-[560px] mx-auto px-6 pt-10 pb-8 flex flex-col gap-5 flex-1">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src={logoMz.url}
            alt="InterGO"
            className="w-40 h-auto drop-shadow-[0_0_20px_rgba(0,255,26,0.35)]"
          />
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ color: "#00FF1A", letterSpacing: "0.02em" }}
          >
            Escolha sua cidade na BAHIA
          </h1>

          {atual && (
            <div className="text-xs text-white/50">
              Atual: <strong className="text-white/80">{atual.cidade}/{atual.uf}</strong>
            </div>
          )}
        </div>

        <div className="relative">
          <input
            className="input-mz w-full pl-10"
            placeholder="Buscar cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
            <EmojiIcon e="🔎" />
          </span>
        </div>

        <div
          className="flex-1 rounded-2xl border border-white/10 bg-black/40 overflow-hidden"
          style={{ boxShadow: "0 0 24px rgba(0,255,26,0.08)" }}
        >
          {loading ? (
            <div className="p-6 text-center text-sm text-white/60">Carregando cidades...</div>
          ) : filtrados.length === 0 ? (
            <div className="p-6 text-center text-sm text-white/60">
              Nenhuma cidade encontrada para “{busca}”.
            </div>
          ) : (
            <ul className="max-h-[55vh] overflow-auto divide-y divide-white/5">
              {filtrados.map((m) => {
                const ativa = atual?.cidade === m && atual?.uf === "BA";
                return (
                  <li key={m}>
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => void escolher(m)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 active:bg-white/10 flex items-center justify-between gap-3 disabled:opacity-60"
                    >
                      <span className="font-medium">{m}</span>
                      {ativa && (
                        <span
                          className="text-xs font-bold"
                          style={{ color: "#00FF1A" }}
                        >
                          ✓ atual
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-white/50">
          Você poderá trocar sua cidade depois nas configurações.
        </p>
      </div>
    </main>
  );
}
