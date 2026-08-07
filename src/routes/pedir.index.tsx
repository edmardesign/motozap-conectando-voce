import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Search, Bell, ChevronRight, Star, Clock, Bike, Grid2x2, Flame, Tv, SlidersHorizontal, Tag, Truck, Percent, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, useCarrinho } from "@/lib/pedir/carrinho";
import { mapLoja, mapProduto } from "@/lib/pedir/db";
import type { Loja, Produto } from "@/lib/pedir/tipos";
import { useAuth } from "@/hooks/use-auth";
import bannerSushi from "@/assets/pedir/banner-sushi.png.asset.json";
import bannerEntregaGratis from "@/assets/pedir/banner-entrega-gratis.png.asset.json";
import bannerDoceSalgada from "@/assets/pedir/banner-doce-salgada.png.asset.json";
import bannerAraci from "@/assets/pedir/banner-araci.png.asset.json";
import reel1 from "@/assets/pedir/reel-1.mp4.asset.json";
import reel2 from "@/assets/pedir/reel-2.mp4.asset.json";
import reel3 from "@/assets/pedir/reel-3.mp4.asset.json";
import reel4 from "@/assets/pedir/reel-4.mp4.asset.json";
import reel5 from "@/assets/pedir/reel-5.mp4.asset.json";
import { PedirOnboarding } from "@/components/pedir/onboarding";
import { CATEGORIAS_TOPO } from "@/lib/pedir/categorias";


const BANNERS = [
  { src: bannerEntregaGratis.url, alt: "Entrega grátis só no Bora Zé!" },
  { src: bannerSushi.url, alt: "Hoje tem sushi" },
  { src: bannerAraci.url, alt: "Estamos chegando em Araci" },
  { src: bannerDoceSalgada.url, alt: "Doce ou salgada? Você prefere qual?" },
];

const REELS_VIDEOS = [reel1.url, reel2.url, reel3.url, reel4.url, reel5.url];

export const Route = createFileRoute("/pedir/")({
  component: Home,
});

/* ---------- Categorias visuais ---------- */

const CATEGORIAS = CATEGORIAS_TOPO;


/* ---------- Filtros rápidos ---------- */

const FILTROS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "avaliado", label: "mais avaliado", icon: Star },
  { id: "desconto", label: "desconto", icon: Percent },
  { id: "gratis", label: "entrega grátis", icon: Truck },
  { id: "ofertas", label: "ofertas", icon: Tag },
];

/* ---------- Página ---------- */

function Home() {
  const { totalItens, subtotal } = useCarrinho();
  const { user } = useAuth();
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      let cidadeId: string | null = null;
      if (user) {
        const { data: perfil } = await supabase
          .from("profiles")
          .select("cidade_id")
          .eq("id", user.id)
          .maybeSingle();
        cidadeId = perfil?.cidade_id ?? null;
      }

      let q = supabase
        .from("food_lojas")
        .select("*")
        .eq("ativo", true)
        .order("aberto", { ascending: false })
        .order("avaliacao", { ascending: false })
        .limit(60);
      if (cidadeId) q = q.eq("cidade_id", cidadeId);
      const { data: lojasRows, error: lojasErr } = await q;

      if (lojasErr) {
        toast.error("Não foi possível carregar os restaurantes, tente novamente");
        setCarregando(false);
        return;
      }

      let dados = lojasRows ?? [];
      if (cidadeId && dados.length === 0) {
        const { data: outros } = await supabase
          .from("food_lojas")
          .select("*")
          .eq("ativo", true)
          .order("avaliacao", { ascending: false })
          .limit(60);
        dados = outros ?? [];
      }
      const mapeadas = dados.map(mapLoja);
      setLojas(mapeadas);
      setCarregando(false);

      if (mapeadas.length > 0) {
        const { data: prodRows } = await supabase
          .from("food_produtos")
          .select("*")
          .in("loja_id", mapeadas.map((l) => l.id))
          .eq("disponivel", true)
          .order("destaque", { ascending: false })
          .limit(12);
        setProdutos((prodRows ?? []).map((p) => mapProduto(p)));
      }
    })();
  }, [user]);

  const reels = lojas.slice(0, 6);
  const emAlta = lojas.slice(0, 8);
  const novas = lojas.slice(0, 8);
  const destaque = lojas[0];
  const nomePorLoja = Object.fromEntries(lojas.map((l) => [l.id, l.nome]));
  const notaPorLoja = Object.fromEntries(lojas.map((l) => [l.id, l.avaliacao]));
  const maisAvaliados = [...produtos]
    .sort((a, b) => (notaPorLoja[b.lojaId] ?? 0) - (notaPorLoja[a.lojaId] ?? 0))
    .slice(0, 8);

  return (
    <div style={{ background: "var(--dz-bg)" }}>
      <PedirOnboarding />
      {/* HEADER */}
      <header
        className="px-5"
        style={{
          paddingTop: "calc(env(safe-area-inset-top,0px) + 56px)",
          paddingBottom: 14,
          background: "var(--dz-bg)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[19px] font-black text-[color:var(--dz-ink)] leading-tight">
            Bem-vindo ao Bora Zé! <span aria-hidden>👋</span>
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/pedir/buscar"
              aria-label="Buscar"
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "var(--dz-surface-2)" }}
            >
              <Search size={18} color="var(--dz-ink)" />
            </Link>
            <button
              type="button"
              aria-label="Notificações"
              className="w-10 h-10 rounded-full flex items-center justify-center relative"
              style={{ background: "var(--dz-surface-2)" }}
            >
              <Bell size={18} color="var(--dz-ink)" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-7 pb-4">
        {/* GRID CATEGORIAS */}
        <section className="px-5">
          <div className="grid grid-cols-5 gap-2.5">
            {CATEGORIAS.map((c) => (
              <Link
                key={c.id}
                to="/pedir/buscar"
                className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 transition-transform active:scale-[0.97]"
                style={{ background: "var(--dz-surface-2)" }}
              >
                <span className="text-[26px] leading-none" aria-hidden>{c.emoji}</span>
                <span className="text-[10.5px] font-semibold text-center leading-tight text-[color:var(--dz-ink)]">
                  {c.label}
                </span>
              </Link>
            ))}
            <Link
              to="/pedir/categorias"
              aria-label="Ver todas as categorias"
              className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-1 transition-transform active:scale-[0.97]"
              style={{ background: "var(--dz-surface-2)" }}
            >
              <Grid2x2 size={22} color="var(--dz-ink-2)" strokeWidth={2.2} />
              <span className="text-[10.5px] font-semibold text-center leading-tight text-[color:var(--dz-ink)]">
                Ver tudo
              </span>
            </Link>
          </div>
        </section>


        {/* FILTROS RÁPIDOS */}
        <section className="-mt-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-1">
            <button
              type="button"
              aria-label="Filtros"
              className="shrink-0 w-10 h-9 rounded-full flex items-center justify-center relative"
              style={{ background: "var(--dz-surface-2)", border: "1px solid var(--dz-line)" }}
            >
              <SlidersHorizontal size={16} color="var(--dz-brand-strong)" />
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: "var(--dz-brand)" }}
              />
            </button>
            {FILTROS.map((f) => (
              <Link
                key={f.id}
                to="/pedir/buscar"
                className="shrink-0 flex items-center gap-1.5 px-3.5 h-9 rounded-full text-[12.5px] font-semibold text-[color:var(--dz-ink-2)]"
                style={{ border: "1px solid var(--dz-line)", background: "var(--dz-surface)" }}
              >
                <f.icon size={13} color="var(--dz-muted)" />
                {f.label}
              </Link>
            ))}
          </div>
        </section>

        {/* BANNER PROMO — carrossel edge-peek, autoplay 7s */}
        <BannersCarrossel />

        {/* REELS */}
        <section>
          <div className="px-5 flex items-center gap-2 mb-3">
            <Tv size={18} color="var(--dz-brand-strong)" />
            <h2 className="text-[17px] font-black text-[color:var(--dz-ink)]">🎬 Reels</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-1">
            {REELS_VIDEOS.map((src, i) => {
              const loja = reels[i];
              const inner = (
                <>
                  <video
                    src={src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.7) 100%)",
                    }}
                  />
                  {loja && (
                    <>
                      <div
                        className="absolute top-2.5 left-2.5 w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2"
                        style={{ background: "#FFFFFF", borderColor: "#FFFFFF" }}
                      >
                        {loja.logo ? (
                          <img src={loja.logo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-black text-[color:var(--dz-brand-strong)]">
                            {loja.nome.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="absolute left-3 right-3 bottom-2.5 text-white text-[14px] font-bold leading-tight line-clamp-2">
                        {loja.nome}
                      </p>
                    </>
                  )}
                </>
              );
              const style = {
                width: 156,
                height: 232,
                borderRadius: 20,
                background: "var(--dz-surface-3)",
              } as const;
              return loja ? (
                <Link
                  key={i}
                  to="/pedir/loja/$id"
                  params={{ id: loja.id }}
                  className="shrink-0 relative overflow-hidden"
                  style={style}
                >
                  {inner}
                </Link>
              ) : (
                <div key={i} className="shrink-0 relative overflow-hidden" style={style}>
                  {inner}
                </div>
              );
            })}
          </div>
        </section>

        {/* EM ALTA HOJE — card container */}
        <section className="px-5">
          <div
            className="rounded-3xl p-4"
            style={{
              background: "var(--dz-surface-2)",
              border: "1px solid var(--dz-line)",
            }}
          >
            <div className="flex items-end justify-between gap-3 mb-1">
              <div className="min-w-0">
                <h2 className="text-[17px] font-black text-[color:var(--dz-ink)] flex items-center gap-1.5">
                  🔥 Em alta hoje <Flame size={16} color="#FF6A00" />
                </h2>
                <p className="dz-caption mt-0.5">Aqui está uma indicação para o seu pedido</p>
              </div>
              <Link
                to="/pedir/buscar"
                className="text-[12.5px] font-bold shrink-0 flex items-center gap-0.5"
                style={{ color: "var(--dz-brand-strong)" }}
              >
                ver tudo <ChevronRight size={14} />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pt-3">
              {emAlta.map((l) => (
                <Link
                  key={l.id}
                  to="/pedir/loja/$id"
                  params={{ id: l.id }}
                  className="shrink-0 relative overflow-hidden bg-white"
                  style={{
                    width: 140,
                    borderRadius: 18,
                    boxShadow: "0 6px 18px -10px rgba(15,20,30,0.18)",
                  }}
                >
                  <div className="h-24 relative" style={{ background: "var(--dz-surface-3)" }}>
                    {l.imagem && (
                      <img src={l.imagem} alt={l.nome} className="w-full h-full object-cover" />
                    )}
                    <span
                      className="absolute -bottom-3 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-black"
                      style={{
                        background: "#FFB800",
                        color: "#241700",
                        boxShadow: "0 4px 10px -4px rgba(0,0,0,0.25)",
                      }}
                    >
                      <Star size={10} fill="#241700" color="#241700" />
                      {l.avaliacao.toFixed(1)}
                    </span>
                  </div>
                  <div className="pt-4 pb-2.5 px-2.5">
                    <p className="text-[12px] font-bold truncate text-[color:var(--dz-ink)]">
                      {l.nome}
                    </p>
                    <p className="text-[10.5px] text-[color:var(--dz-muted)] flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {l.tempoMin}-{l.tempoMax} min
                    </p>
                  </div>
                </Link>
              ))}
              {carregando && <p className="dz-caption py-4">Carregando…</p>}
            </div>
          </div>
        </section>

        {/* NOVIDADES */}
        {novas.length > 0 && (
          <section>
            <div className="dz-section-title">
              <div className="min-w-0">
                <h2 className="dz-h1">🆕 Novidades no Bora Zé!</h2>
                <p className="dz-caption mt-0.5">Os melhores da cidade estão aqui!</p>
              </div>
              <Link
                to="/pedir/buscar"
                className="text-[12.5px] font-bold shrink-0"
                style={{ color: "var(--dz-brand-strong)" }}
              >
                Ver tudo
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 pb-1">
              {novas.map((l) => (
                <Link
                  key={l.id}
                  to="/pedir/loja/$id"
                  params={{ id: l.id }}
                  className="shrink-0 flex flex-col items-center gap-1.5"
                  style={{ width: 84 }}
                >
                  <div
                    className="w-[72px] h-[72px] rounded-2xl overflow-hidden flex items-center justify-center"
                    style={{ background: "var(--dz-surface-3)" }}
                  >
                    {l.logo || l.imagem ? (
                      <img src={l.logo ?? l.imagem} alt={l.nome} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[15px] font-black text-[color:var(--dz-brand-strong)]">
                        {l.nome.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-center leading-tight line-clamp-2 text-[color:var(--dz-ink)]">
                    {l.nome}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ITENS MAIS BEM AVALIADOS */}
        {maisAvaliados.length > 0 && (
          <section>
            <div className="dz-section-title">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="dz-h1">⭐ Itens mais bem avaliados</h2>
                <span
                  className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black"
                  style={{ background: "var(--dz-brand)", color: "#0B0B0B" }}
                >
                  <Star size={10} fill="#0B0B0B" color="#0B0B0B" /> TOP
                </span>
              </div>
              <Link
                to="/pedir/buscar"
                className="text-[12.5px] font-bold shrink-0 flex items-center gap-0.5"
                style={{ color: "var(--dz-brand-strong)" }}
              >
                Ver todos <ChevronRight size={14} />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-1">
              {maisAvaliados.map((p) => (
                <Link
                  key={`top-${p.id}`}
                  to="/pedir/produto/$id"
                  params={{ id: p.id }}
                  className="shrink-0 bg-white overflow-hidden"
                  style={{
                    width: 158,
                    borderRadius: 18,
                    border: "1px solid var(--dz-line)",
                    boxShadow: "0 6px 18px -12px rgba(15,20,30,0.2)",
                  }}
                >
                  <div className="h-28 relative" style={{ background: "var(--dz-surface-3)" }}>
                    {p.imagem && <img src={p.imagem} alt={p.nome} className="w-full h-full object-cover" />}
                    <span
                      className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black"
                      style={{ background: "#FFFFFF", color: "var(--dz-ink)" }}
                    >
                      <Star size={9} fill="var(--dz-star)" color="var(--dz-star)" />
                      {(notaPorLoja[p.lojaId] ?? 5).toFixed(1)}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <span
                      className="inline-block max-w-full truncate px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: "var(--dz-surface-2)", color: "var(--dz-brand-strong)" }}
                    >
                      {nomePorLoja[p.lojaId] ?? "Restaurante"}
                    </span>
                    <p className="text-[12.5px] font-semibold leading-tight mt-1.5 line-clamp-2 text-[color:var(--dz-ink)]">
                      {p.nome}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[13px] font-black" style={{ color: "var(--dz-brand-strong)" }}>
                        {formatBRL(p.preco)}
                      </span>
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[16px] font-black leading-none"
                        style={{ background: "var(--dz-brand-strong)" }}
                        aria-hidden
                      >
                        +
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* PRODUTOS EM ALTA */}
        {produtos.length > 0 && (
          <section>
            <div className="dz-section-title">
              <h2 className="dz-h1">📈 Produtos em alta</h2>
              <Link
                to="/pedir/buscar"
                className="text-[12.5px] font-bold shrink-0"
                style={{ color: "var(--dz-brand-strong)" }}
              >
                Ver tudo
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-1">
              {produtos.map((p) => (
                <Link
                  key={p.id}
                  to="/pedir/produto/$id"
                  params={{ id: p.id }}
                  className="shrink-0 bg-white overflow-hidden"
                  style={{
                    width: 158,
                    borderRadius: 18,
                    border: "1px solid var(--dz-line)",
                    boxShadow: "0 6px 18px -12px rgba(15,20,30,0.2)",
                  }}
                >
                  <div className="h-28 relative" style={{ background: "var(--dz-surface-3)" }}>
                    {p.imagem && <img src={p.imagem} alt={p.nome} className="w-full h-full object-cover" />}
                    <span
                      className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black"
                      style={{ background: "#FFFFFF", color: "var(--dz-ink)" }}
                    >
                      <Star size={9} fill="var(--dz-star)" color="var(--dz-star)" />
                      {(notaPorLoja[p.lojaId] ?? 5).toFixed(1)}
                    </span>
                  </div>

                  <div className="p-2.5">
                    <span
                      className="inline-block max-w-full truncate px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: "var(--dz-surface-2)", color: "var(--dz-brand-strong)" }}
                    >
                      {nomePorLoja[p.lojaId] ?? "Restaurante"}
                    </span>
                    <p className="text-[12.5px] font-semibold leading-tight mt-1.5 line-clamp-2 text-[color:var(--dz-ink)]">
                      {p.nome}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[13px] font-black" style={{ color: "var(--dz-brand-strong)" }}>
                        {formatBRL(p.preco)}
                      </span>
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[16px] font-black leading-none"
                        style={{ background: "var(--dz-brand-strong)" }}
                        aria-hidden
                      >
                        +
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* PROMOS PARA VOCÊ — cards verticais */}
        <section>
          <div className="dz-section-title">
            <h2 className="dz-h1">🛍️ Promos para você</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-1">
            {BANNERS.map((b, i) => (
              <Link
                key={i}
                to="/pedir/buscar"
                className="shrink-0 relative overflow-hidden bg-black"
                style={{ width: 172, aspectRatio: "3 / 4", borderRadius: 18 }}
              >
                <img src={b.src} alt={b.alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
              </Link>
            ))}
          </div>
        </section>

        {/* CTA ENDEREÇO — faixa de destaque */}
        <div className="px-5">
          <Link
            to="/pedir/carrinho"
            className="block relative overflow-hidden text-center px-5 py-3"
            style={{
              borderRadius: 18,
              background: "linear-gradient(120deg, var(--dz-ink) 0%, #1d1d1d 60%, var(--dz-brand-strong) 240%)",
            }}
          >
            <p className="text-white text-[14px] font-black leading-none tracking-tight">
              🖼️ O PEDIDO JÁ ESTÁ NA SACOLA!
            </p>
            <p className="text-[11px] font-black mt-1" style={{ color: "var(--dz-brand)" }}>
              Só falta seu endereço
            </p>
          </Link>
        </div>

        {/* EM DESTAQUE — loja principal */}
        {destaque && (
          <section className="px-5">
            <h2 className="dz-h1 mb-3">🏆 Em destaque</h2>
            <Link
              to="/pedir/loja/$id"
              params={{ id: destaque.id }}
              className="block relative overflow-hidden"
              style={{
                borderRadius: 22,
                aspectRatio: "16 / 8",
                background: "var(--dz-surface-3)",
                boxShadow: "0 14px 32px -18px rgba(20,16,45,0.4)",
              }}
            >
              {destaque.imagem && (
                <img src={destaque.imagem} alt={destaque.nome} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)" }}
              />
              <div className="absolute left-4 right-4 bottom-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center">
                  {destaque.logo ? (
                    <img src={destaque.logo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[12px] font-black text-[color:var(--dz-brand-strong)]">
                      {destaque.nome.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-[16px] font-black truncate">{destaque.nome}</p>
                  <p className="text-white/85 text-[12px] truncate">
                    {destaque.avaliacao.toFixed(1)} ★ • {destaque.tempoMin}-{destaque.tempoMax} min •{" "}
                    {destaque.taxa === 0 ? "Entrega grátis" : formatBRL(destaque.taxa)}
                  </p>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* CLUBE BORA ZÉ! — assinatura */}
        <div className="px-5">
          <Link
            to="/pedir/buscar"
            className="flex items-center gap-3 px-4 py-4"
            style={{
              borderRadius: 20,
              background: "linear-gradient(100deg, #101010 0%, #202020 100%)",
              border: "1px solid var(--dz-line)",
            }}
          >
            <span className="text-[28px] leading-none shrink-0" aria-hidden>👑</span>
            <div className="min-w-0 flex-1">
              <p className="text-white text-[14px] font-bold leading-snug">
                Ganhe <span className="font-black">descontos exclusivos</span> assinando o{" "}
                <span className="font-black" style={{ color: "var(--dz-brand)" }}>Clube Bora Zé!</span>
              </p>
            </div>
            <span
              className="shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-black text-center leading-tight"
              style={{ background: "var(--dz-brand)", color: "#0B0B0B" }}
            >
              CUPOM
              <br />
              R$10 OFF
            </span>
          </Link>
        </div>

        {/* TODOS OS RESTAURANTES */}
        <section>
          <div className="dz-section-title">
            <h2 className="dz-h1">🍽️ Todos os restaurantes</h2>
            <span className="dz-caption">{lojas.length} lugares</span>
          </div>
          <ul className="flex flex-col gap-3 px-5">
            {lojas.map((l) => (
              <li key={l.id}>
                <Link
                  to="/pedir/loja/$id"
                  params={{ id: l.id }}
                  className="dz-card dz-card-hover flex items-stretch"
                >
                  <div className="w-24 shrink-0 relative" style={{ background: "var(--dz-surface-3)" }}>
                    {l.imagem && (
                      <img src={l.imagem} alt={l.nome} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-bold truncate text-[color:var(--dz-ink)]">{l.nome}</p>
                      <span className="flex items-center gap-0.5 text-[12px] font-bold shrink-0 text-[color:var(--dz-ink)]">
                        <Star size={12} color="var(--dz-star)" fill="var(--dz-star)" />
                        {l.avaliacao.toFixed(1)}
                      </span>
                    </div>
                    <p className="dz-caption mt-0.5 truncate">{l.tags[0] ?? l.categoria}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[12px] text-[color:var(--dz-ink-2)]">
                      <span className="flex items-center gap-1"><Clock size={12} /> {l.tempoMin}-{l.tempoMax} min</span>
                      <span className="text-[color:var(--dz-line-strong)]">•</span>
                      <span>{l.taxa === 0 ? "Grátis" : formatBRL(l.taxa)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
            {carregando && <li className="dz-caption text-center py-6">Carregando…</li>}
            {!carregando && lojas.length === 0 && (
              <li className="dz-caption text-center py-6">Nenhum restaurante encontrado.</li>
            )}
          </ul>
        </section>

        {/* CTA mototaxi */}
        <div className="px-5">
          <Link to="/passageiro/home" className="dz-card dz-card-hover flex items-center gap-3 p-4">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--dz-ink)" }}>
              <Bike size={20} color="#FFFFFF" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[color:var(--dz-ink)]">Precisa de mototáxi?</p>
              <p className="dz-caption">Chame um mototaxista Bora Zé! agora.</p>
            </div>
            <ChevronRight size={18} color="var(--dz-muted)" />
          </Link>
        </div>
      </main>

      {totalItens > 0 && (
        <Link
          to="/pedir/carrinho"
          className="fixed left-4 right-4 z-30 flex items-center justify-between px-5 py-3.5 dz-btn-primary"
          style={{ bottom: 96, borderRadius: 999, maxWidth: 460, margin: "0 auto" }}
        >
          <span className="font-black text-[13px]">
            Ver carrinho • {totalItens} {totalItens === 1 ? "item" : "itens"}
          </span>
          <span className="font-black text-[13px]">{formatBRL(subtotal)}</span>
        </Link>
      )}
    </div>
  );
}

/* ---------- Carrossel de banners com autoplay ---------- */
function BannersCarrossel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const id = window.setInterval(() => {
      if (pausedRef.current || !scrollerRef.current) return;
      const node = scrollerRef.current;
      const next = (index + 1) % BANNERS.length;
      const child = node.children[next] as HTMLElement | undefined;
      if (!child) return;
      node.scrollTo({ left: child.offsetLeft - node.offsetLeft, behavior: "smooth" });
      setIndex(next);
    }, 7000);
    return () => window.clearInterval(id);
  }, [index]);

  function onScroll() {
    const node = scrollerRef.current;
    if (!node) return;
    const children = Array.from(node.children) as HTMLElement[];
    let closest = 0;
    let min = Infinity;
    const center = node.scrollLeft + node.clientWidth / 2;
    children.forEach((c, i) => {
      const cc = c.offsetLeft + c.clientWidth / 2 - node.offsetLeft;
      const d = Math.abs(cc - center);
      if (d < min) { min = d; closest = i; }
    });
    if (closest !== index) setIndex(closest);
  }

  return (
    <section
      onPointerDown={() => { pausedRef.current = true; }}
      onPointerUp={() => { pausedRef.current = false; }}
      onPointerLeave={() => { pausedRef.current = false; }}
    >
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto no-scrollbar px-5 snap-x snap-mandatory scroll-smooth"
      >
        {BANNERS.map((b, i) => (
          <div
            key={i}
            className="snap-center shrink-0 relative overflow-hidden bg-black"
            style={{
              width: "calc(100vw - 40px)",
              maxWidth: 460,
              aspectRatio: "1920 / 810",
              borderRadius: 24,
              boxShadow: "0 14px 32px -14px rgba(20,16,45,0.35)",
            }}
          >
            <img
              src={b.src}
              alt={b.alt}
              loading={i === 0 ? "eager" : "lazy"}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 justify-center mt-3">
        {BANNERS.map((_, i) => (
          <span
            key={i}
            style={{
              height: 6,
              width: i === index ? 22 : 6,
              borderRadius: 999,
              background: i === index ? "var(--dz-brand-strong)" : "rgba(0,0,0,0.15)",
              transition: "all 220ms ease",
            }}
          />
        ))}
      </div>
    </section>
  );
}
