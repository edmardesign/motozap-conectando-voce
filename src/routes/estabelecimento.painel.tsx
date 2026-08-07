import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bell, Pause, Play, Check, X, Package, ChefHat, Store, BarChart3, Settings, Plus, Trash2, Pencil, Loader2, Printer, Ticket, Clock as ClockIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatBRL } from "@/lib/pedir/carrinho";
import { imprimirComanda } from "@/lib/pedir/comanda";
import type { Database } from "@/integrations/supabase/types";


export const Route = createFileRoute("/estabelecimento/painel")({
  beforeLoad: () => {
    throw redirect({ to: "/parceiros/painel" });
  },
});

const NEON = "#00FF1A";

type Aba = "novos" | "preparo" | "prontos" | "concluidos" | "cardapio" | "cupons" | "horarios" | "acertos" | "relatorios" | "config";
type StatusPedido = Database["public"]["Enums"]["food_status_pedido"];
type Loja = Database["public"]["Tables"]["food_lojas"]["Row"];
type Produto = Database["public"]["Tables"]["food_produtos"]["Row"];
type PedidoRow = Database["public"]["Tables"]["food_pedidos"]["Row"];
type ItemRow = Database["public"]["Tables"]["food_pedido_itens"]["Row"];

interface PedidoCompleto extends PedidoRow {
  cliente_nome?: string | null;
  itens: ItemRow[];
}

function abaDeStatus(s: StatusPedido): Aba | null {
  if (s === "novo") return "novos";
  if (s === "confirmado" || s === "em_preparo") return "preparo";
  if (s === "pronto" || s === "em_entrega") return "prontos";
  if (s === "entregue" || s === "cancelado") return "concluidos";
  return null;
}

export function Painel() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [aba, setAba] = useState<Aba>("novos");
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [lojaId, setLojaId] = useState<string | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  // 1) Carregar lojas do dono
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.error("Você precisa estar logado como restaurante");
      navigate({ to: "/food/auth" });
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("food_lojas")
        .select("*")
        .eq("dono_user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) {
        toast.error("Não foi possível carregar seus restaurantes, tente novamente");
        setBootLoading(false);
        return;
      }
      if (!data || data.length === 0) {
        toast.error("Você precisa estar logado como restaurante");
        navigate({ to: "/food/auth" });
        return;
      }
      setLojas(data);
      setLojaId(data[0].id);
      setBootLoading(false);
    })();
  }, [user, authLoading, navigate]);

  if (authLoading || bootLoading || !lojaId) {
    return (
      <div style={{ minHeight: "100dvh", background: "#000", color: "#fff" }} className="flex items-center justify-center">
        <Loader2 className="animate-spin" color={NEON} />
      </div>
    );
  }

  const loja = lojas.find((l) => l.id === lojaId)!;
  return (
    <PainelLoja
      key={lojaId}
      loja={loja}
      lojas={lojas}
      onTrocarLoja={setLojaId}
      aba={aba}
      setAba={setAba}
    />
  );
}

function PainelLoja({
  loja,
  lojas,
  onTrocarLoja,
  aba,
  setAba,
}: {
  loja: Loja;
  lojas: Loja[];
  onTrocarLoja: (id: string) => void;
  aba: Aba;
  setAba: (a: Aba) => void;
}) {
  const [pedidos, setPedidos] = useState<PedidoCompleto[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [pausado, setPausado] = useState<boolean>(loja.pausado);
  const [carregandoPedidos, setCarregandoPedidos] = useState(true);
  const [carregandoCardapio, setCarregandoCardapio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const jaVistos = useRef<Set<string>>(new Set());

  // Carregar pedidos + itens + nomes
  async function recarregarPedidos() {
    const { data: peds, error } = await supabase
      .from("food_pedidos")
      .select("*")
      .eq("loja_id", loja.id)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Não foi possível carregar seus pedidos, tente novamente");
      setCarregandoPedidos(false);
      return;
    }
    const ids = (peds ?? []).map((p) => p.id);
    let itensPorPedido: Record<string, ItemRow[]> = {};
    let nomes: Record<string, string> = {};
    if (ids.length) {
      const { data: itens } = await supabase
        .from("food_pedido_itens")
        .select("*")
        .in("pedido_id", ids);
      (itens ?? []).forEach((it) => {
        itensPorPedido[it.pedido_id] = itensPorPedido[it.pedido_id] ?? [];
        itensPorPedido[it.pedido_id].push(it);
      });
      const clienteIds = Array.from(new Set((peds ?? []).map((p) => p.cliente_user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", clienteIds);
      (profs ?? []).forEach((p) => {
        nomes[p.id] = p.nome;
      });
    }
    const completos: PedidoCompleto[] = (peds ?? []).map((p) => ({
      ...p,
      itens: itensPorPedido[p.id] ?? [],
      cliente_nome: nomes[p.cliente_user_id] ?? null,
    }));
    // Marca vistos p/ evitar toque em pedidos antigos
    completos.forEach((p) => jaVistos.current.add(p.id));
    setPedidos(completos);
    setCarregandoPedidos(false);
  }

  useEffect(() => {
    setCarregandoPedidos(true);
    recarregarPedidos();
    // Realtime
    const ch = supabase
      .channel(`painel-loja-${loja.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_pedidos", filter: `loja_id=eq.${loja.id}` },
        (payload) => {
          const novo = payload.new as PedidoRow | undefined;
          if (payload.eventType === "INSERT" && novo && !jaVistos.current.has(novo.id)) {
            jaVistos.current.add(novo.id);
            toast.success(`Novo pedido #${novo.numero_pedido}!`);
            audioRef.current?.play().catch(() => {});
          }
          recarregarPedidos();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_pedido_itens" },
        () => recarregarPedidos()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loja.id]);

  // Cardápio
  async function recarregarCardapio() {
    setCarregandoCardapio(true);
    const { data, error } = await supabase
      .from("food_produtos")
      .select("*")
      .eq("loja_id", loja.id)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Não foi possível carregar o cardápio, tente novamente");
      setCarregandoCardapio(false);
      return;
    }
    setProdutos(data ?? []);
    setCarregandoCardapio(false);
  }

  useEffect(() => {
    if (aba === "cardapio") recarregarCardapio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, loja.id]);

  async function togglePausado() {
    const novo = !pausado;
    setPausado(novo);
    const { error } = await supabase.from("food_lojas").update({ pausado: novo }).eq("id", loja.id);
    if (error) {
      toast.error("Não foi possível alterar o status da loja");
      setPausado(!novo);
    }
  }

  async function atualizarStatus(id: string, novo: StatusPedido, extras: Partial<PedidoRow> = {}) {
    const { error } = await supabase
      .from("food_pedidos")
      .update({ status: novo, ...extras })
      .eq("id", id);
    if (error) toast.error("Não foi possível atualizar o pedido, tente novamente");
  }

  async function recusar(id: string) {
    const motivo = window.prompt("Motivo da recusa (será enviado ao cliente):")?.trim();
    if (!motivo) return;
    await atualizarStatus(id, "cancelado", {
      motivo_cancelamento: motivo,
      cancelado_em: new Date().toISOString(),
    });
  }

  const contagens = useMemo(() => {
    const filtrar = (a: Aba) =>
      pedidos.filter((p) => {
        if (a === "concluidos") {
          const hoje = new Date().toISOString().slice(0, 10);
          return abaDeStatus(p.status) === "concluidos" && p.created_at.slice(0, 10) === hoje;
        }
        return abaDeStatus(p.status) === a;
      }).length;
    return {
      novos: filtrar("novos"),
      preparo: filtrar("preparo"),
      prontos: filtrar("prontos"),
      concluidos: filtrar("concluidos"),
    };
  }, [pedidos]);

  const listaAtual = pedidos.filter((p) => {
    if (aba === "concluidos") {
      const hoje = new Date().toISOString().slice(0, 10);
      return abaDeStatus(p.status) === "concluidos" && p.created_at.slice(0, 10) === hoje;
    }
    return abaDeStatus(p.status) === aba;
  });

  return (
    <div style={{ minHeight: "100dvh", background: "#000", color: "#fff" }}>
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRlIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YS4AAAA=" preload="auto" />
      <header className="flex items-center gap-3 p-4 sticky top-0 z-10" style={{ background: "#0A0A0A", borderBottom: `1px solid ${NEON}33` }}>
        <Link to="/pedir" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#1a1a1a" }}>
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          {lojas.length > 1 ? (
            <select
              value={loja.id}
              onChange={(e) => onTrocarLoja(e.target.value)}
              className="bg-transparent text-base font-black outline-none w-full"
              style={{ color: "#fff" }}
            >
              {lojas.map((l) => (
                <option key={l.id} value={l.id} style={{ background: "#0A0A0A" }}>
                  Painel — {l.nome}
                </option>
              ))}
            </select>
          ) : (
            <h1 className="text-base font-black truncate">Painel — {loja.nome}</h1>
          )}
          <p className="text-[11px]" style={{ color: pausado ? "#ff6b6b" : NEON }}>
            {pausado ? "PAUSADO" : "ABERTO agora"}
          </p>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center relative" style={{ background: "#1a1a1a" }}>
          <Bell size={16} />
          {contagens.novos > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: NEON, color: "#000" }}>
              {contagens.novos}
            </span>
          )}
        </button>
        <button onClick={togglePausado} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#1a1a1a" }}>
          {pausado ? <Play size={16} color={NEON} /> : <Pause size={16} color={NEON} />}
        </button>
      </header>

      <nav className="flex gap-2 overflow-x-auto p-3" style={{ background: "#0A0A0A", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <TabBtn active={aba === "novos"} onClick={() => setAba("novos")} icon={<Bell size={14} />} label={`Novos (${contagens.novos})`} />
        <TabBtn active={aba === "preparo"} onClick={() => setAba("preparo")} icon={<ChefHat size={14} />} label={`Preparo (${contagens.preparo})`} />
        <TabBtn active={aba === "prontos"} onClick={() => setAba("prontos")} icon={<Package size={14} />} label={`Prontos (${contagens.prontos})`} />
        <TabBtn active={aba === "concluidos"} onClick={() => setAba("concluidos")} icon={<Check size={14} />} label={`Concluídos (${contagens.concluidos})`} />
        <TabBtn active={aba === "cardapio"} onClick={() => setAba("cardapio")} icon={<Store size={14} />} label="Cardápio" />
        <TabBtn active={aba === "cupons"} onClick={() => setAba("cupons")} icon={<Ticket size={14} />} label="Cupons" />
        <TabBtn active={aba === "horarios"} onClick={() => setAba("horarios")} icon={<ClockIcon size={14} />} label="Horários" />
        <TabBtn active={aba === "acertos"} onClick={() => setAba("acertos")} icon={<FileText size={14} />} label="Acertos" />
        <TabBtn active={aba === "relatorios"} onClick={() => setAba("relatorios")} icon={<BarChart3 size={14} />} label="Relatórios" />
        <TabBtn active={aba === "config"} onClick={() => setAba("config")} icon={<Settings size={14} />} label="Configurações" />
      </nav>




      <main className="p-4 flex flex-col gap-3">
        {(aba === "novos" || aba === "preparo" || aba === "prontos" || aba === "concluidos") && (
          <>
            {carregandoPedidos && (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" color={NEON} /></div>
            )}
            {!carregandoPedidos && listaAtual.length === 0 && <Empty label="Sem pedidos nesta lista." />}
            {!carregandoPedidos && listaAtual.map((p) => (
              <PedidoCard
                key={p.id}
                p={p}
                lojaNome={loja.nome}
                onAceitar={() => atualizarStatus(p.id, "confirmado", { confirmado_em: new Date().toISOString() })}
                onRecusar={() => recusar(p.id)}
                onPronto={() => atualizarStatus(p.id, "pronto", { pronto_em: new Date().toISOString() })}
              />
            ))}
          </>
        )}

        {aba === "cardapio" && (
          <AbaCardapio
            lojaId={loja.id}
            produtos={produtos}
            carregando={carregandoCardapio}
            onRecarregar={recarregarCardapio}
          />
        )}

        {aba === "cupons" && <AbaCupons lojaId={loja.id} />}
        {aba === "horarios" && <AbaHorarios lojaId={loja.id} />}
        {aba === "acertos" && <AbaAcertos lojaId={loja.id} />}

        {(aba === "relatorios" || aba === "config") && (
          <div className="rounded-xl p-8 text-center" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm text-white/60">Em breve.</p>
          </div>
        )}
      </main>

    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold" style={{ background: active ? NEON : "#1a1a1a", color: active ? "#000" : "#ddd" }}>
      {icon}{label}
    </button>
  );
}

function PedidoCard({ p, lojaNome, onAceitar, onRecusar, onPronto }: {
  p: PedidoCompleto;
  lojaNome: string;
  onAceitar: () => void;
  onRecusar: () => void;
  onPronto: () => void;
}) {
  const emPreparo = p.status === "confirmado" || p.status === "em_preparo";
  const pronto = p.status === "pronto" || p.status === "em_entrega";
  const podeImprimir = p.status !== "novo";
  return (
    <div className="rounded-xl p-4" style={{ background: "#111", border: `1px solid ${p.status === "novo" ? NEON : "rgba(255,255,255,0.06)"}` }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black">#{p.numero_pedido} • {p.cliente_nome ?? "Cliente"}</p>
          <p className="text-[11px] text-white/50">— • {p.forma_pagamento}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold" style={{ color: NEON }}>{formatBRL(Number(p.total))}</span>
          {podeImprimir && (
            <button
              onClick={() => imprimirComanda({ pedido: p, itens: p.itens, clienteNome: p.cliente_nome, lojaNome })}
              title="Imprimir comanda"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Printer size={14} color={NEON} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 text-xs text-white/70">
        {p.itens.map((i) => (
          <p key={i.id}><b className="text-white">{i.quantidade}x</b> {i.nome_snapshot}</p>
        ))}
        {p.itens.length === 0 && <p className="text-white/40">Sem itens</p>}
      </div>
      {p.observacao && <p className="mt-2 text-[11px] text-white/50 italic">Obs: {p.observacao}</p>}
      <div className="mt-3 flex gap-2">
        {p.status === "novo" && (
          <>
            <button onClick={onRecusar} className="flex-1 rounded-full py-2 text-xs font-bold flex items-center justify-center gap-1" style={{ background: "#1a1a1a", color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.3)" }}>
              <X size={13} /> Recusar
            </button>
            <button onClick={onAceitar} className="flex-1 rounded-full py-2 text-xs font-bold flex items-center justify-center gap-1" style={{ background: NEON, color: "#000" }}>
              <Check size={13} /> Aceitar
            </button>
          </>
        )}
        {emPreparo && (
          <button onClick={onPronto} className="flex-1 rounded-full py-2 text-xs font-bold flex items-center justify-center gap-1" style={{ background: NEON, color: "#000" }}>
            <Package size={13} /> Marcar como pronto
          </button>
        )}
        {pronto && <p className="text-xs text-white/50">Aguardando entregador…</p>}
        {p.status === "entregue" && <p className="text-xs text-white/40">Entregue</p>}
        {p.status === "cancelado" && <p className="text-xs" style={{ color: "#ff6b6b" }}>Cancelado{p.motivo_cancelamento ? `: ${p.motivo_cancelamento}` : ""}</p>}
      </div>
    </div>
  );
}


function Empty({ label }: { label: string }) {
  return <p className="text-center text-sm text-white/50 py-12">{label}</p>;
}

// ============ Cardápio ============

interface FormProduto {
  id?: string;
  nome: string;
  preco: string;
  descricao: string;
  imagem_url: string;
  destaque: boolean;
}

function AbaCardapio({
  lojaId,
  produtos,
  carregando,
  onRecarregar,
}: {
  lojaId: string;
  produtos: Produto[];
  carregando: boolean;
  onRecarregar: () => void;
}) {
  const [form, setForm] = useState<FormProduto | null>(null);

  async function toggleDisponivel(p: Produto) {
    const novo = !p.disponivel;
    const { error } = await supabase
      .from("food_produtos")
      .update({ disponivel: novo })
      .eq("id", p.id);
    if (error) {
      toast.error("Não foi possível atualizar o item");
      return;
    }
    toast.success(novo ? `${p.nome} disponível` : `${p.nome} marcado como esgotado`);
    onRecarregar();
  }


  async function excluir(p: Produto) {
    if (!window.confirm(`Excluir "${p.nome}"?`)) return;
    const { error } = await supabase.from("food_produtos").delete().eq("id", p.id);
    if (error) {
      toast.error("Não foi possível excluir o item");
      return;
    }
    toast.success("Item excluído");
    onRecarregar();
  }

  async function salvar() {
    if (!form) return;
    const preco = Number(String(form.preco).replace(",", "."));
    if (!form.nome.trim() || !Number.isFinite(preco) || preco <= 0) {
      toast.error("Informe nome e preço válidos");
      return;
    }
    const payload = {
      loja_id: lojaId,
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      imagem_url: form.imagem_url.trim() || null,
      preco,
      destaque: form.destaque,
    };
    const { error } = form.id
      ? await supabase.from("food_produtos").update(payload).eq("id", form.id)
      : await supabase.from("food_produtos").insert(payload);
    if (error) {
      toast.error("Não foi possível salvar o item");
      return;
    }
    toast.success(form.id ? "Item atualizado" : "Item adicionado");
    setForm(null);
    onRecarregar();
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() =>
            setForm({ nome: "", preco: "", descricao: "", imagem_url: "", destaque: false })
          }
          className="rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1"
          style={{ background: NEON, color: "#000" }}
        >
          <Plus size={14} /> Novo item
        </button>
      </div>

      {carregando && (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin" color={NEON} /></div>
      )}
      {!carregando && produtos.length === 0 && <Empty label="Nenhum item no cardápio ainda." />}

      {!carregando && produtos.map((p) => (
        <div key={p.id} className="flex gap-3 rounded-xl p-3 items-center" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)" }}>
          {p.imagem_url ? (
            <img src={p.imagem_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-lg" style={{ background: "#1a1a1a" }} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{p.nome}</p>
            <p className="text-[11px] text-white/50">{formatBRL(Number(p.preco))}</p>
          </div>
          <button
            onClick={() => toggleDisponivel(p)}
            className="rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-wider shrink-0"
            style={{
              background: p.disponivel ? "#1a1a1a" : "#3a0000",
              color: p.disponivel ? "#ddd" : "#ff6b6b",
              border: `1px solid ${p.disponivel ? "rgba(255,255,255,0.1)" : "rgba(255,107,107,0.35)"}`,
            }}
          >
            {p.disponivel ? "Disponível" : "Esgotado"}
          </button>

          <button
            onClick={() =>
              setForm({
                id: p.id,
                nome: p.nome,
                preco: String(p.preco),
                descricao: p.descricao ?? "",
                imagem_url: p.imagem_url ?? "",
                destaque: p.destaque,
              })
            }
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#1a1a1a" }}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => excluir(p)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#1a1a1a", color: "#ff6b6b" }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setForm(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#111", border: `1px solid ${NEON}55` }}>
            <h3 className="text-base font-black">{form.id ? "Editar item" : "Novo item"}</h3>
            <Input label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
            <Input label="Preço (R$)" value={form.preco} onChange={(v) => setForm({ ...form, preco: v })} />
            <Input label="Descrição" value={form.descricao} onChange={(v) => setForm({ ...form, descricao: v })} />
            <Input label="URL da imagem" value={form.imagem_url} onChange={(v) => setForm({ ...form, imagem_url: v })} />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={form.destaque} onChange={(e) => setForm({ ...form, destaque: e.target.checked })} />
              Destaque
            </label>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setForm(null)} className="flex-1 rounded-full py-2 text-xs font-bold" style={{ background: "#1a1a1a" }}>Cancelar</button>
              <button onClick={salvar} className="flex-1 rounded-full py-2 text-xs font-bold" style={{ background: NEON, color: "#000" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-widest text-white/50">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg px-3 py-2 text-sm outline-none"
        style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
      />
    </label>
  );
}

// ============ Cupons ============

type Cupom = {
  id: string;
  loja_id: string;
  codigo: string;
  tipo: "percentual" | "fixo";
  valor: number;
  validade: string | null;
  ativo: boolean;
  apenas_primeira_compra: boolean;
  usos_max: number | null;
  usos: number;
};

function AbaCupons({ lojaId }: { lojaId: string }) {
  const [lista, setLista] = useState<Cupom[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState<Partial<Cupom> | null>(null);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase
      .from("food_cupons" as never)
      .select("*")
      .eq("loja_id", lojaId)
      .order("created_at", { ascending: false });
    if (error) toast.error("Não foi possível carregar os cupons");
    setLista((data ?? []) as Cupom[]);
    setCarregando(false);
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [lojaId]);

  async function salvar() {
    if (!form) return;
    const codigo = String(form.codigo ?? "").trim().toUpperCase();
    const valor = Number(String(form.valor ?? "").toString().replace(",", "."));
    if (!codigo || !Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe código e valor válidos");
      return;
    }
    const payload = {
      loja_id: lojaId,
      codigo,
      tipo: form.tipo ?? "percentual",
      valor,
      validade: form.validade || null,
      ativo: form.ativo ?? true,
      apenas_primeira_compra: form.apenas_primeira_compra ?? false,
      usos_max: form.usos_max ?? null,
    };
    const q = form.id
      ? (supabase as any).from("food_cupons").update(payload).eq("id", form.id)
      : (supabase as any).from("food_cupons").insert(payload);
    const { error } = await q;
    if (error) { toast.error("Não foi possível salvar o cupom"); return; }
    toast.success(form.id ? "Cupom atualizado" : "Cupom criado");
    setForm(null);
    carregar();
  }

  async function toggleAtivo(c: Cupom) {
    const { error } = await (supabase as any).from("food_cupons").update({ ativo: !c.ativo }).eq("id", c.id);
    if (error) { toast.error("Não foi possível atualizar"); return; }
    carregar();
  }

  async function excluir(c: Cupom) {
    if (!window.confirm(`Excluir cupom ${c.codigo}?`)) return;
    const { error } = await (supabase as any).from("food_cupons").delete().eq("id", c.id);
    if (error) { toast.error("Não foi possível excluir"); return; }
    carregar();
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setForm({ codigo: "", tipo: "percentual", valor: 10, ativo: true, apenas_primeira_compra: false })}
          className="rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1"
          style={{ background: NEON, color: "#000" }}
        >
          <Plus size={14} /> Novo cupom
        </button>
      </div>

      {carregando && <div className="flex justify-center py-8"><Loader2 className="animate-spin" color={NEON} /></div>}
      {!carregando && lista.length === 0 && <Empty label="Nenhum cupom criado." />}

      {!carregando && lista.map((c) => (
        <div key={c.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black flex items-center gap-2">
              {c.codigo}
              {c.apenas_primeira_compra && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${NEON}22`, color: NEON }}>1ª COMPRA</span>}
              {!c.ativo && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "#3a0000", color: "#ff6b6b" }}>INATIVO</span>}
            </p>
            <p className="text-[11px] text-white/50">
              {c.tipo === "percentual" ? `${c.valor}% OFF` : formatBRL(Number(c.valor)) + " OFF"}
              {c.validade ? ` • até ${new Date(c.validade).toLocaleDateString("pt-BR")}` : ""}
              {` • ${c.usos} uso(s)`}
            </p>
          </div>
          <button onClick={() => toggleAtivo(c)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#1a1a1a" }} title={c.ativo ? "Desativar" : "Ativar"}>
            {c.ativo ? <Pause size={13} /> : <Play size={13} color={NEON} />}
          </button>
          <button onClick={() => setForm(c)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#1a1a1a" }}>
            <Pencil size={13} />
          </button>
          <button onClick={() => excluir(c)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#1a1a1a", color: "#ff6b6b" }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setForm(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#111", border: `1px solid ${NEON}55` }}>
            <h3 className="text-base font-black">{form.id ? "Editar cupom" : "Novo cupom"}</h3>
            <Input label="Código (ex: BEMVINDO10)" value={String(form.codigo ?? "")} onChange={(v) => setForm({ ...form, codigo: v.toUpperCase() })} />
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-widest text-white/50">Tipo</span>
              <select
                value={form.tipo ?? "percentual"}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as "percentual" | "fixo" })}
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              >
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Valor fixo (R$)</option>
              </select>
            </label>
            <Input label={form.tipo === "fixo" ? "Valor (R$)" : "Valor (%)"} value={String(form.valor ?? "")} onChange={(v) => setForm({ ...form, valor: Number(v.replace(",", ".")) as number })} />
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-widest text-white/50">Validade (opcional)</span>
              <input
                type="date"
                value={form.validade ?? ""}
                onChange={(e) => setForm({ ...form, validade: e.target.value || null })}
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </label>
            <Input label="Máx. de usos (opcional)" value={form.usos_max ? String(form.usos_max) : ""} onChange={(v) => setForm({ ...form, usos_max: v ? Number(v) : null })} />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!form.apenas_primeira_compra} onChange={(e) => setForm({ ...form, apenas_primeira_compra: e.target.checked })} />
              Apenas primeira compra do cliente
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={form.ativo ?? true} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
              Ativo
            </label>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setForm(null)} className="flex-1 rounded-full py-2 text-xs font-bold" style={{ background: "#1a1a1a" }}>Cancelar</button>
              <button onClick={salvar} className="flex-1 rounded-full py-2 text-xs font-bold" style={{ background: NEON, color: "#000" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============ Horários ============

type Horario = { id: string; loja_id: string; dia_semana: number; abre: string; fecha: string; ativo: boolean };
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function AbaHorarios({ lojaId }: { lojaId: string }) {
  const [linhas, setLinhas] = useState<Horario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const { data } = await supabase
      .from("food_horarios" as never)
      .select("*")
      .eq("loja_id", lojaId)
      .order("dia_semana", { ascending: true });
    const existentes = (data ?? []) as Horario[];
    const porDia = new Map(existentes.map((h) => [h.dia_semana, h]));
    const todos: Horario[] = Array.from({ length: 7 }, (_, d) =>
      porDia.get(d) ?? { id: "", loja_id: lojaId, dia_semana: d, abre: "18:00", fecha: "23:00", ativo: false }
    );
    setLinhas(todos);
    setCarregando(false);
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [lojaId]);

  function editar(d: number, patch: Partial<Horario>) {
    setLinhas((prev) => prev.map((h) => (h.dia_semana === d ? { ...h, ...patch } : h)));
  }

  async function salvarTudo() {
    setSalvando(true);
    for (const h of linhas) {
      if (h.id) {
        await (supabase as any).from("food_horarios")
          .update({ abre: h.abre, fecha: h.fecha, ativo: h.ativo })
          .eq("id", h.id);
      } else if (h.ativo) {
        await (supabase as any).from("food_horarios")
          .insert({ loja_id: lojaId, dia_semana: h.dia_semana, abre: h.abre, fecha: h.fecha, ativo: true });
      }
    }
    setSalvando(false);
    toast.success("Horários salvos");
    carregar();
  }

  if (carregando) return <div className="flex justify-center py-8"><Loader2 className="animate-spin" color={NEON} /></div>;

  return (
    <>
      <p className="text-[11px] text-white/50">Fuso: America/São_Paulo. Fora do horário, o cliente vê "Fechado" e não consegue pedir.</p>
      {linhas.map((h) => (
        <div key={h.dia_semana} className="rounded-xl p-3 flex items-center gap-2" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)" }}>
          <label className="flex items-center gap-2 flex-1 min-w-0">
            <input type="checkbox" checked={h.ativo} onChange={(e) => editar(h.dia_semana, { ativo: e.target.checked })} />
            <span className="text-sm font-semibold">{DIAS[h.dia_semana]}</span>
          </label>
          <input type="time" value={h.abre} onChange={(e) => editar(h.dia_semana, { abre: e.target.value })} disabled={!h.ativo}
            className="rounded-lg px-2 py-1.5 text-sm outline-none" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", opacity: h.ativo ? 1 : 0.4 }} />
          <span className="text-white/50 text-xs">até</span>
          <input type="time" value={h.fecha} onChange={(e) => editar(h.dia_semana, { fecha: e.target.value })} disabled={!h.ativo}
            className="rounded-lg px-2 py-1.5 text-sm outline-none" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", opacity: h.ativo ? 1 : 0.4 }} />
        </div>
      ))}
      <button onClick={salvarTudo} disabled={salvando} className="rounded-full py-3 text-sm font-black mt-2" style={{ background: NEON, color: "#000" }}>
        {salvando ? "Salvando…" : "Salvar horários"}
      </button>
    </>
  );
}

// ============ Acertos ============

type Relatorio = {
  qtd_pedidos: number;
  total_vendido: number;
  comissao_percentual: number;
  comissao: number;
  a_repassar: number;
  a_receber: number;
};

function isoWeekRange(offset = 0): { desde: string; ate: string } {
  const now = new Date();
  const day = now.getDay(); // 0 dom .. 6 sab
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { desde: fmt(monday), ate: fmt(sunday) };
}

function AbaAcertos({ lojaId }: { lojaId: string }) {
  const inicio = isoWeekRange(0);
  const [desde, setDesde] = useState(inicio.desde);
  const [ate, setAte] = useState(inicio.ate);
  const [rel, setRel] = useState<Relatorio | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [historico, setHistorico] = useState<Array<{ id: string; periodo_inicio: string; periodo_fim: string; total_vendido: number; a_repassar: number; a_receber: number; fechado_em: string }>>([]);

  async function calcular() {
    setCarregando(true);
    const { data, error } = await (supabase as any).rpc("food_relatorio_acerto", { _loja_id: lojaId, _desde: desde, _ate: ate });
    if (error) { toast.error("Não foi possível gerar o relatório"); setCarregando(false); return; }
    setRel(data as unknown as Relatorio);
    setCarregando(false);
  }

  async function carregarHistorico() {
    const { data } = await supabase
      .from("food_acertos" as never)
      .select("*")
      .eq("loja_id", lojaId)
      .order("fechado_em", { ascending: false })
      .limit(10);
    setHistorico((data ?? []) as never);
  }

  useEffect(() => { calcular(); carregarHistorico(); /* eslint-disable-next-line */ }, [lojaId]);

  async function fechar() {
    if (!rel || rel.qtd_pedidos === 0) { toast.error("Nenhum pedido no período"); return; }
    if (!window.confirm(`Fechar acerto de ${rel.qtd_pedidos} pedido(s)? Essa ação trava o período.`)) return;
    setFechando(true);
    const { error } = await (supabase as any).rpc("food_fechar_acerto", { _loja_id: lojaId, _desde: desde, _ate: ate });
    setFechando(false);
    if (error) { toast.error("Não foi possível fechar o acerto"); return; }
    toast.success("Acerto fechado");
    calcular(); carregarHistorico();
  }

  function definirSemana(offset: number) {
    const r = isoWeekRange(offset);
    setDesde(r.desde); setAte(r.ate);
  }

  return (
    <>
      <div className="flex gap-2">
        <button onClick={() => definirSemana(0)} className="rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ background: "#1a1a1a", color: "#ddd" }}>Semana atual</button>
        <button onClick={() => definirSemana(-1)} className="rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ background: "#1a1a1a", color: "#ddd" }}>Semana passada</button>
      </div>
      <div className="rounded-xl p-3 flex flex-wrap items-end gap-2" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)" }}>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase text-white/50">De</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg px-2 py-1.5 text-sm outline-none" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase text-white/50">Até</span>
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="rounded-lg px-2 py-1.5 text-sm outline-none" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        </label>
        <button onClick={calcular} className="rounded-full px-4 py-2 text-xs font-bold ml-auto" style={{ background: NEON, color: "#000" }}>
          {carregando ? "Calculando…" : "Recalcular"}
        </button>
      </div>

      {rel && (
        <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs uppercase tracking-widest text-white/50">Resumo do período</p>
          <Linha rot="Pedidos entregues" val={String(rel.qtd_pedidos)} />
          <Linha rot="Total vendido" val={formatBRL(Number(rel.total_vendido))} />
          <Linha rot={`Minha comissão (${Number(rel.comissao_percentual).toFixed(1)}%)`} val={formatBRL(Number(rel.comissao))} />
          <Linha rot="A repassar à loja (pagos online)" val={formatBRL(Number(rel.a_repassar))} destaque />
          <Linha rot="A receber da loja (pagos na entrega)" val={formatBRL(Number(rel.a_receber))} destaque />
          <button onClick={fechar} disabled={fechando || rel.qtd_pedidos === 0} className="rounded-full py-3 text-sm font-black mt-2" style={{ background: NEON, color: "#000", opacity: rel.qtd_pedidos === 0 ? 0.4 : 1 }}>
            {fechando ? "Fechando…" : "Marcar como acertado"}
          </button>
        </div>
      )}

      {historico.length > 0 && (
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs uppercase tracking-widest text-white/50">Últimos acertos</p>
          {historico.map((h) => (
            <div key={h.id} className="flex justify-between text-[12px] py-1 border-t border-white/5 first:border-0 pt-2 first:pt-0">
              <span>{new Date(h.periodo_inicio).toLocaleDateString("pt-BR")} → {new Date(h.periodo_fim).toLocaleDateString("pt-BR")}</span>
              <span className="font-bold" style={{ color: NEON }}>{formatBRL(Number(h.total_vendido))}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Linha({ rot, val, destaque }: { rot: string; val: string; destaque?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-white/70">{rot}</span>
      <span className="font-bold" style={{ color: destaque ? NEON : "#fff" }}>{val}</span>
    </div>
  );
}
