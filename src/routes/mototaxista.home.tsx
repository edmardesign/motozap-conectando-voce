import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { formatBRL, whatsappLink } from "@/lib/pricing";
import { formatarTelefone, formatarPlaca } from "@/utils/formatters";
import { haversineKm } from "@/lib/haversine";
import { gerarRelatorioPdf, type CorridaRel, type PeriodoRel } from "@/lib/relatorio-pdf";
import { IOSSwitch } from "@/components/ios-switch";
import { TabBar } from "@/components/tab-bar";
import { ChatCorrida, ChatFab } from "@/components/chat-corrida";
import { EmojiIcon } from "@/components/emoji-icon";

export const Route = createFileRoute("/mototaxista/home")({
  component: MototaxistaHome,
});

type Corrida = {
  id: string;
  status: "aguardando" | "aceita" | "em_andamento" | "concluida" | "cancelada";
  passageiro_id: string;
  origem_endereco: string;
  destino_endereco: string;
  valor_estimado: number;
  valor_final: number | null;
  eh_gratuita: boolean;
  distancia_km: number;
  criado_em?: string;
  origem_lat?: number | null;
  origem_lng?: number | null;
  // Snapshot tarifário (BRZ)
  valor_base_aplicado?: number | null;
  taxa_bora_ze_aplicada?: number | null;
  valor_total_passageiro?: number | null;
  // Pegue Ali
  tipo?: "corrida" | "pegue_ali" | null;
  descricao?: string | null;
  foto_url?: string | null;
  pagamento_no_local?: boolean | null;
  valor_pagamento_local?: number | null;
  em_nome_de?: string | null;
  status_encomenda?:
    | "a_caminho_loja" | "na_loja" | "a_caminho_destino" | "entregue"
    | "produto_indisponivel" | "valor_alterado_pendente" | "ninguem_recebe"
    | null;
  valor_produto_ajustado?: number | null;
  ninguem_recebe_iniciado_em?: string | null;
  foto_retirada_url?: string | null;
  foto_pagamento_url?: string | null;
};

type CorridaBroadcast = {
  id: string;
  tipo: "corrida" | "pegue_ali" | null;
  status: "aguardando";
  bairro_origem: string | null;
  bairro_destino: string | null;
  cidade: string | null;
  estado: string | null;
  distancia_km: number;
  valor_estimado: number;
  criado_em: string | null;
  origem_lat: number | null;
  origem_lng: number | null;
};

type Passageiro = { nome: string; telefone: string; foto_url: string | null };
type MotoData = {
  nome: string;
  telefone: string;
  foto_url: string | null;
  plano: string | null;
  avaliacao_media: number | null;
  total_corridas: number | null;
  created_at?: string | null;
};

type Aba = "corridas" | "financeiro" | "perfil";

const COLORS = {
  bg: "#0F0F10",
  bg2: "#131F24",
  card: "#1A2C33",
  border: "rgba(134,150,160,0.15)",
  text: "#F5F5F5",
  textDim: "#8696A0",
  accent: "#3DB54A",
  danger: "#E04848",
};

const CARD_SHADOW = "0 2px 8px rgba(0,0,0,0.3)";

function planoLabel(p: string | null): { label: string; color: string } {
  switch (p) {
    case "ouro": return { label: "OURO", color: "#FFD700" };
    case "prata": return { label: "PRATA", color: "#C0C0C0" };
    case "mensal": return { label: "MENSAL", color: "#3DB54A" };
    default: return { label: "—", color: "#8696A0" };
  }
}

function MototaxistaHome() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const geo = useGeolocation();
  const db = supabase as any;

  const [online, setOnline] = useState(false);
  const [aceitaPegueAli, setAceitaPegueAli] = useState(true);
  const [prefDistanciaKm, setPrefDistanciaKm] = useState(5);
  const [prefValorMinimo, setPrefValorMinimo] = useState(5);
  const [prefSoCidade, setPrefSoCidade] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [mensalidadeAtiva, setMensalidadeAtiva] = useState<boolean | null>(null);
  const [corridasCiclo, setCorridasCiclo] = useState(0);
  const [taxaCiclo, setTaxaCiclo] = useState<number>(0.5);
  const valorCiclo = useMemo(() => Number((taxaCiclo * 20).toFixed(2)), [taxaCiclo]);
  const valorCicloFmt = valorCiclo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const [contaBloqueada, setContaBloqueada] = useState(false);
  const [moto, setMoto] = useState<MotoData | null>(null);
  const [exportPeriodo, setExportPeriodo] = useState<"semana" | "mes" | "personalizado">("mes");
  const [exportInicio, setExportInicio] = useState<string>("");
  const [exportFim, setExportFim] = useState<string>("");
  const [exportando, setExportando] = useState(false);
  const [aguardando, setAguardando] = useState<CorridaBroadcast[]>([]);
  const [atual, setAtual] = useState<Corrida | null>(null);
  const [passageiro, setPassageiro] = useState<Passageiro | null>(null);
  const [busy, setBusy] = useState(false);
  const [aba, setAba] = useState<Aba>("corridas");
  const [ganhosCorridas, setGanhosCorridas] = useState(0);
  const [countCorridas, setCountCorridas] = useState(0);
  const [chegou, setChegou] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [confirmConcluir, setConfirmConcluir] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [valorFinalInput, setValorFinalInput] = useState("");
  const [now, setNow] = useState(Date.now());
  const [minhaPos, setMinhaPos] = useState<{ lat: number; lng: number } | null>(null);
  const alertedRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ==== Financeiro ====
  type FiltroPeriodo = "hoje" | "semana" | "mes" | "custom";
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("hoje");
  const [filtroInicio, setFiltroInicio] = useState<string>("");
  const [filtroFim, setFiltroFim] = useState<string>("");
  const [saldoDisponivel, setSaldoDisponivel] = useState(0);
  const [saldoALiberar, setSaldoALiberar] = useState(0);
  const [chavePix, setChavePix] = useState<string | null>(null);
  const [chavePixTipo, setChavePixTipo] = useState<string | null>(null);
  const [showSaqueModal, setShowSaqueModal] = useState(false);
  const [showPixCadastro, setShowPixCadastro] = useState(false);
  const [novaChavePix, setNovaChavePix] = useState("");
  const [novaChavePixTipo, setNovaChavePixTipo] = useState<string>("cpf");
  const [valorSaqueInput, setValorSaqueInput] = useState("");
  const [saqueBusy, setSaqueBusy] = useState(false);
  const [historicoSaques, setHistoricoSaques] = useState<
    Array<{ id: string; valor: number; status: string; solicitado_em: string; processado_em: string | null }>
  >([]);

  const periodoRange = useMemo(() => {
    const agora = new Date();
    let inicio = new Date(); let fim = new Date();
    if (filtroPeriodo === "hoje") {
      inicio = new Date(agora); inicio.setHours(0,0,0,0);
      fim = new Date(agora); fim.setHours(23,59,59,999);
    } else if (filtroPeriodo === "semana") {
      const dow = agora.getDay(); // 0=dom
      inicio = new Date(agora); inicio.setDate(agora.getDate() - dow); inicio.setHours(0,0,0,0);
      fim = new Date(inicio); fim.setDate(inicio.getDate() + 6); fim.setHours(23,59,59,999);
    } else if (filtroPeriodo === "mes") {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
      fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      if (filtroInicio) inicio = new Date(filtroInicio + "T00:00:00"); else inicio.setHours(0,0,0,0);
      if (filtroFim) fim = new Date(filtroFim + "T23:59:59"); else fim.setHours(23,59,59,999);
    }
    return { inicio, fim };
  }, [filtroPeriodo, filtroInicio, filtroFim]);


  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // GPS: sempre atualiza posição local; envia ao banco apenas quando em corrida
  useEffect(() => {
    if (!user) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const send = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMinhaPos(coords);
          if (atual || online) {
            db.from("mototaxistas")
              .update({ latitude: coords.lat, longitude: coords.lng })
              .eq("id", user.id);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 4000, timeout: 8000 },
      );
    };
    send();
    const t = setInterval(send, 5000);
    return () => clearInterval(t);
  }, [user, atual?.id, online]);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth/mototaxista" });
  }, [authLoading, user, navigate]);

  const [trialDiasRestantes, setTrialDiasRestantes] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: m } = await db
        .from("mototaxistas")
        .select("status, mensalidade_ativa, aceita_delivery, aceita_pegue_ali, preferencias, plano, plano_validade, corridas_desde_pagamento, conta_bloqueada_comissao, taxa_ciclo_atual")
        .eq("id", user.id)
        .maybeSingle();
      const { data: p } = await db
        .from("profiles")
        .select("nome, telefone, foto_url, criado_em")
        .eq("id", user.id)
        .maybeSingle();
      if (m) {
        // Verificar expiração do trial/plano
        if ((m as any).plano_validade) {
          const validade = new Date((m as any).plano_validade as string);
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const diffMs = validade.getTime() - hoje.getTime();
          const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (dias <= 0) {
            // Trial expirado: bloqueia e redireciona para planos
            if (m.mensalidade_ativa) {
              await db.from("mototaxistas").update({ mensalidade_ativa: false } as any).eq("id", user.id);
            }
            toast.error("Seu período grátis acabou. Escolha um plano para continuar.");
            navigate({ to: "/mototaxista/planos" });
            return;
          }
          setTrialDiasRestantes(dias);
        }
        setOnline(m.status === "disponivel");
        setMensalidadeAtiva(m.mensalidade_ativa);
        setAceitaPegueAli((m as any).aceita_pegue_ali ?? true);
        const prefs = ((m as any).preferencias ?? {}) as Record<string, unknown>;
        if (typeof prefs.distancia_max_km === "number") setPrefDistanciaKm(prefs.distancia_max_km);
        if (typeof prefs.valor_minimo === "number") setPrefValorMinimo(prefs.valor_minimo);
        if (typeof prefs.so_cidade === "boolean") setPrefSoCidade(prefs.so_cidade);
        setCorridasCiclo(m.corridas_desde_pagamento ?? 0);
        setTaxaCiclo(Number((m as any).taxa_ciclo_atual ?? 0.5));
        setContaBloqueada(!!m.conta_bloqueada_comissao);
      }
      const { count: totalCorridas } = await db
        .from("corridas")
        .select("id", { count: "exact", head: true })
        .eq("mototaxista_id", user.id)
        .eq("status", "concluida");
      setMoto({
        nome: p?.nome ?? "Mototaxista",
        telefone: p?.telefone ?? "",
        foto_url: p?.foto_url ?? null,
        plano: m?.plano ?? null,
        avaliacao_media: null,
        total_corridas: totalCorridas ?? 0,
        created_at: p?.criado_em ?? null,
      });
      const { data: c } = await supabase
        .from("corridas")
        .select("id,status,passageiro_id,origem_endereco,destino_endereco,valor_estimado,valor_final,eh_gratuita,distancia_km,criado_em,valor_base_aplicado,taxa_bora_ze_aplicada,valor_total_passageiro")
        .eq("mototaxista_id", user.id)
        .in("status", ["aceita", "em_andamento"])
        .maybeSingle();
      if (c) setAtual(c as Corrida);
    })();
  }, [user]);

  // Realtime: reflete bloqueio/reset de comissão feito por trigger ou admin
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`moto-self-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mototaxistas", filter: `id=eq.${user.id}` },
        (payload) => {
          const m = payload.new as any;
          setCorridasCiclo(m.corridas_desde_pagamento ?? 0);
          if (m.taxa_ciclo_atual != null) setTaxaCiclo(Number(m.taxa_ciclo_atual));
          setContaBloqueada(!!m.conta_bloqueada_comissao);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  type ItemFinanceiro = {
    id: string;
    tipo: "corrida" | "pegue_ali";
    data: string;
    nome: string;
    valor: number;
  };
  const [itensPeriodo, setItensPeriodo] = useState<ItemFinanceiro[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const inicioIso = periodoRange.inicio.toISOString();
      const fimIso = periodoRange.fim.toISOString();
      const { data: corr } = await supabase
        .from("corridas")
        .select("id,tipo,valor_final,valor_estimado,criado_em,passageiro_id")
        .eq("mototaxista_id", user.id)
        .eq("status", "concluida")
        .gte("criado_em", inicioIso)
        .lte("criado_em", fimIso)
        .order("criado_em", { ascending: false });
      const cRows = (corr ?? []) as any[];
      const cTot = cRows.reduce((s, r) => s + Number(r.valor_final ?? r.valor_estimado ?? 0), 0);
      setGanhosCorridas(cTot);
      setCountCorridas(cRows.length);

      // Nomes dos passageiros
      const passIds = Array.from(new Set(cRows.map((r) => r.passageiro_id).filter(Boolean)));
      const nomesMap: Record<string, string> = {};
      if (passIds.length > 0) {
        const { data: profs } = await db.from("profiles").select("id,nome").in("id", passIds);
        (profs ?? []).forEach((p: any) => { nomesMap[p.id] = p.nome ?? "Passageiro"; });
      }

      const itens: ItemFinanceiro[] = [
        ...cRows.map((r) => ({
          id: r.id as string,
          tipo: (r.tipo === "pegue_ali" ? "pegue_ali" : "corrida") as "corrida" | "pegue_ali",
          data: r.criado_em as string,
          nome: nomesMap[r.passageiro_id] ?? "Passageiro",
          valor: Number(r.valor_final ?? r.valor_estimado ?? 0),
        })),
      ].sort((a, b) => (a.data < b.data ? 1 : -1));
      setItensPeriodo(itens);
    })();
  }, [user, atual, periodoRange, db]);


  // Carrega saldos, chave Pix e histórico de saques
  const carregarFinanceiro = async () => {
    if (!user) return;
    const { data: cart } = await db
      .from("carteira_mototaxista")
      .select("saldo_disponivel, saldo_pendente")
      .eq("mototaxista_id", user.id)
      .maybeSingle();
    setSaldoDisponivel(Number(cart?.saldo_disponivel ?? 0));

    // "A liberar (últimas 24h)": soma de créditos aprovados nas últimas 24h
    const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: trans } = await db
      .from("transacoes_carteira")
      .select("valor,tipo,criado_em,status")
      .eq("mototaxista_id", user.id)
      .in("tipo", ["credito_corrida_gratuita"])
      .gte("criado_em", desde);
    const aLiberar = (trans ?? []).reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0);
    setSaldoALiberar(aLiberar);

    const { data: m } = await db
      .from("mototaxistas")
      .select("chave_pix, chave_pix_tipo")
      .eq("id", user.id)
      .maybeSingle();
    setChavePix((m as any)?.chave_pix ?? null);
    setChavePixTipo((m as any)?.chave_pix_tipo ?? null);

    const { data: saques } = await db
      .from("solicitacoes_saque")
      .select("id,valor,status,solicitado_em,processado_em")
      .eq("mototaxista_id", user.id)
      .eq("tipo", "pix")
      .order("solicitado_em", { ascending: false })
      .limit(10);
    setHistoricoSaques((saques ?? []) as any);
  };

  useEffect(() => {
    if (aba === "financeiro") carregarFinanceiro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, user]);


  useEffect(() => {
    if (!user || !online || !mensalidadeAtiva || atual) return;
    let cancel = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("corridas_broadcast")
        .select("id,tipo,status,bairro_origem,bairro_destino,cidade,estado,distancia_km,valor_estimado,criado_em,origem_lat,origem_lng")
        .order("criado_em", { ascending: true })
        .limit(20);
      if (!cancel) setAguardando((data ?? []) as CorridaBroadcast[]);
    };
    load();
    const ch = supabase
      .channel("corridas-aguardando")
      .on("postgres_changes", { event: "*", schema: "public", table: "corridas" }, () => load())
      .subscribe();
    return () => { cancel = true; supabase.removeChannel(ch); };
  }, [user, online, mensalidadeAtiva, atual]);

  useEffect(() => {
    if (!atual) { setPassageiro(null); return; }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nome,telefone,foto_url")
        .eq("id", atual.passageiro_id)
        .maybeSingle();
      if (data) setPassageiro(data as Passageiro);
    })();
    const ch = supabase
      .channel(`mt-corrida-${atual.id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "corridas", filter: `id=eq.${atual.id}` },
        (p) => {
          const next = p.new as Corrida;
          setAtual(next);
          if (next.status === "cancelada") {
            toast.error("Corrida cancelada pelo passageiro");
            setAtual(null);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [atual?.id]);

  // Heartbeat de presença enquanto online (a cada 30s)
  useEffect(() => {
    if (!user || !online) return;
    const tick = async () => {
      try {
        let lat: number | null = null;
        let lng: number | null = null;
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve(); },
              () => resolve(),
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 },
            );
          });
        }
        await (supabase as any).rpc("mototaxista_heartbeat", { _lat: lat, _lng: lng });
      } catch { /* noop */ }
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [user, online]);


  async function toggleOnline() {
    if (!user) return;
    setBusy(true);
    const novo = !online;
    let coords: { lat: number; lng: number } | null = null;
    if (novo) coords = await geo.request();

    // 1) Backend valida (aprovação, bloqueio de ciclo, cadastro) via RPC
    const { error: rpcErr } = await (supabase as any).rpc(
      "mototaxista_definir_disponibilidade",
      { _aceitar: novo },
    );
    if (rpcErr) {
      setBusy(false);
      toast.error(rpcErr.message);
      return;
    }

    // 2) Atualiza status/localização legados (compat) — não toca em campos sensíveis
    const { error } = await supabase
      .from("mototaxistas")
      .update({
        status: novo ? "disponivel" : "offline",
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setOnline(novo);
      toast.success(novo ? "Você está aceitando corridas" : "Você ficou offline");
    }
  }


  async function aceitar(c: CorridaBroadcast) {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("corridas")
      .update({ mototaxista_id: user.id, status: "aceita" })
      .eq("id", c.id).eq("status", "aguardando");
    if (error) {
      setBusy(false);
      return toast.error("Não foi possível aceitar (outro mototaxista pode ter pego)");
    }
    // Após aceite, mototaxista_id = auth.uid() → RLS libera SELECT completo
    const { data: full } = await (supabase as any)
      .from("corridas")
      .select("*")
      .eq("id", c.id)
      .maybeSingle();
    setBusy(false);
    if (!full) return toast.error("Corrida não encontrada");
    // Se for pegue_ali, já inicializa status_encomenda
    if (full.tipo === "pegue_ali" && !full.status_encomenda) {
      await (supabase as any)
        .from("corridas")
        .update({ status_encomenda: "a_caminho_loja" })
        .eq("id", c.id);
      full.status_encomenda = "a_caminho_loja";
    }
    setAtual(full as Corrida);
    setChegou(false);
    toast.success("Corrida aceita!");
  }

  async function marcarChegou() {
    if (!atual) return;
    setBusy(true);
    const { error } = await db.rpc("mototaxista_chegou", { _corrida_id: atual.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    setChegou(true);
    toast.success("Passageiro notificado");
  }

  async function iniciar() {
    if (!atual) return;
    setBusy(true);
    const { error } = await supabase.from("corridas").update({ status: "em_andamento" }).eq("id", atual.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.info("Corrida iniciada");
  }

  function abrirConfirmar() {
    if (!atual) return;
    setValorFinalInput(String(atual.valor_estimado ?? 0));
    setConfirmConcluir(true);
  }

  async function concluir() {
    if (!atual) return;
    const valor = Number(valorFinalInput.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0) return toast.error("Valor inválido");
    setBusy(true);
    const { error } = await supabase
      .from("corridas")
      .update({ status: "concluida", valor_final: valor })
      .eq("id", atual.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Corrida concluída — valor creditado");
      setConfirmConcluir(false);
      setAtual(null);
      setChegou(false);
    }
  }

  // ==== Pegue Ali: fluxo do mototaxista ====
  async function avancarStatusEncomenda(next: NonNullable<Corrida["status_encomenda"]>) {
    if (!atual) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("corridas")
      .update({ status_encomenda: next })
      .eq("id", atual.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setAtual({ ...atual, status_encomenda: next });
  }

  async function uploadRetirada(file: File, kind: "produto" | "pagamento") {
    if (!atual || !user) return null;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${atual.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("corrida-retiradas").upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (error) { toast.error("Falha ao enviar foto: " + error.message); return null; }
    return path;
  }

  async function confirmarRetirada(fotoProduto: File, fotoPagamento?: File | null) {
    if (!atual) return;
    setBusy(true);
    const p1 = await uploadRetirada(fotoProduto, "produto");
    if (!p1) { setBusy(false); return; }
    let p2: string | null = null;
    if (fotoPagamento) {
      p2 = await uploadRetirada(fotoPagamento, "pagamento");
      if (!p2) { setBusy(false); return; }
    }
    const { error } = await (supabase as any)
      .from("corridas")
      .update({
        foto_retirada_url: p1,
        foto_pagamento_url: p2,
        status_encomenda: "a_caminho_destino",
      })
      .eq("id", atual.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setAtual({
      ...atual,
      foto_retirada_url: p1,
      foto_pagamento_url: p2,
      status_encomenda: "a_caminho_destino",
    });
    toast.success("Retirada confirmada!");
  }

  async function marcarProdutoIndisponivel() {
    if (!atual) return;
    await avancarStatusEncomenda("produto_indisponivel");
    toast.info("Avise o passageiro pelo chat.");
  }

  async function proporNovoValorProduto(novo: number) {
    if (!atual) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc("mototaxista_alterar_valor_produto", {
      _corrida_id: atual.id,
      _novo_valor: novo,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setAtual({
      ...atual,
      valor_produto_ajustado: novo,
      status_encomenda: "valor_alterado_pendente",
    });
    toast.success("Novo valor enviado ao passageiro");
  }

  async function iniciarTimerNinguemRecebe() {
    if (!atual) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("corridas")
      .update({
        status_encomenda: "ninguem_recebe",
        ninguem_recebe_iniciado_em: new Date().toISOString(),
      })
      .eq("id", atual.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setAtual({
      ...atual,
      status_encomenda: "ninguem_recebe",
      ninguem_recebe_iniciado_em: new Date().toISOString(),
    });
    toast.info("Timer de 5 minutos iniciado.");
  }


  async function togglePegueAli() {
    if (!user) return;
    const novo = !aceitaPegueAli;
    const { error } = await db.from("mototaxistas").update({ aceita_pegue_ali: novo } as any).eq("id", user.id);
    if (error) return toast.error(error.message);
    setAceitaPegueAli(novo);
    toast.success(novo ? "Recebendo pedidos Pegue Ali" : "Pegue Ali desativado");
  }

  async function salvarPreferencias(next?: { distancia_max_km?: number; valor_minimo?: number; so_cidade?: boolean }) {
    if (!user) return;
    const payload = {
      distancia_max_km: next?.distancia_max_km ?? prefDistanciaKm,
      valor_minimo: next?.valor_minimo ?? prefValorMinimo,
      so_cidade: next?.so_cidade ?? prefSoCidade,
    };
    setSavingPrefs(true);
    const { error } = await db.from("mototaxistas").update({ preferencias: payload } as any).eq("id", user.id);
    setSavingPrefs(false);
    if (error) return toast.error(error.message);
    toast.success("Preferências salvas");
  }


  // Raio expansivo: começa em 2km, +1km a cada 15s, máx 15km.
  // Corridas sem coords ou com passageiro na mesma cidade sempre aparecem após 45s.
  const corridasVisiveis = useMemo(() => {
    return aguardando.filter((c) => {
      if (!c.criado_em) return true;
      const ageMs = now - new Date(c.criado_em).getTime();
      if (ageMs > 120_000) return false; // 2 min expira do radar
      // Sem posição do motorista: mostra tudo
      if (!minhaPos || c.origem_lat == null || c.origem_lng == null) return true;
      const dist = haversineKm(minhaPos, { lat: c.origem_lat, lng: c.origem_lng });
      const raioKm = Math.min(15, 2 + Math.floor(ageMs / 15_000));
      return dist <= raioKm;
    });
  }, [aguardando, now, minhaPos]);

  // Alerta sonoro + toast em novas corridas visíveis
  useEffect(() => {
    if (!online || atual) return;
    const novas = corridasVisiveis.filter((c) => !alertedRef.current.has(c.id));
    if (novas.length === 0) return;
    novas.forEach((c) => alertedRef.current.add(c.id));
    try {
      if (!audioRef.current) {
        // Tom curto sintetizado via data URI (beep)
        audioRef.current = new Audio(
          "data:audio/wav;base64,UklGRlwEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTgEAAAA",
        );
      }
      audioRef.current.volume = 0.6;
      audioRef.current.play().catch(() => {});
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        (navigator as any).vibrate?.([200, 80, 200]);
      }
    } catch { /* noop */ }
    toast.success(`Nova corrida disponível — ${formatBRL(novas[0].valor_estimado)}`);
  }, [corridasVisiveis, online, atual]);

  const planoInfo = planoLabel(moto?.plano ?? null);

  if (authLoading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <div className="spinner-mz" />
      </main>
    );
  }

  if (mensalidadeAtiva === false) {
    return (
      <main className="min-h-screen px-6 py-10 flex flex-col gap-4 items-center justify-center" style={{ background: COLORS.bg, color: COLORS.text }}>
        <div className="text-5xl">⏰</div>
        <h1 className="text-2xl font-bold text-center">Seu período grátis acabou</h1>
        <p className="text-center text-base max-w-sm" style={{ color: COLORS.textDim }}>
          Escolha um plano para continuar recebendo corridas no InterGO
        </p>
        <Link to="/mototaxista/planos" className="btn-cta">VER PLANOS</Link>
        <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth/mototaxista" }); }} className="text-[13px]" style={{ color: COLORS.textDim }}>
          Sair
        </button>
      </main>
    );
  }

  if (contaBloqueada) {
    const wa = `https://wa.me/5575988558754?text=${encodeURIComponent(`Olá! Acabei de pagar minha comissão InterGO (${valorCicloFmt} - 20 corridas). Segue comprovante:`)}`;
    return (
      <main className="min-h-screen px-6 py-10 flex flex-col gap-5 items-center justify-center" style={{ background: COLORS.bg, color: COLORS.text }}>
        <div className="text-6xl"><EmojiIcon e="🏍️" /></div>
        <h1 className="text-2xl font-bold text-center leading-tight">
          Você já rodou 20 corridas<br />com a gente!
        </h1>
        <p className="text-center text-[15px] max-w-sm" style={{ color: COLORS.textDim }}>
          Passa o Pix de <strong style={{ color: COLORS.accent }}>{valorCicloFmt}</strong> pra continuar recebendo chamados. É rapidinho <EmojiIcon e="🙌" />
        </p>
        <p className="text-[11px]" style={{ color: COLORS.textDim }}>Taxa vigente neste ciclo: {taxaCiclo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} × 20</p>
        <div className="w-full max-w-sm rounded-xl p-4 flex flex-col gap-2" style={{ background: COLORS.card, boxShadow: CARD_SHADOW }}>
          <div className="text-[12px]" style={{ color: COLORS.textDim }}>Chave Pix</div>
          <div className="font-mono text-[15px] break-all">motozap@pix.com.br</div>
        </div>
        <a href={wa} target="_blank" rel="noreferrer" className="btn-cta w-full max-w-sm">
          JÁ PAGUEI — ENVIAR COMPROVANTE
        </a>
        <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth/mototaxista" }); }} className="text-[13px]" style={{ color: COLORS.textDim }}>
          Sair
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24" style={{ background: COLORS.bg, color: COLORS.text }}>
      {/* HEADER */}
      <header
        className="px-6 pt-6 pb-5"
        style={{ background: "linear-gradient(180deg, #0F0F10 0%, #131F24 100%)" }}
      >
        {trialDiasRestantes !== null && trialDiasRestantes <= 15 && (
          <Link
            to="/mototaxista/planos"
            className="mb-3 rounded-lg px-3 py-2 text-[12.5px] flex items-center gap-2"
            style={{
              background: trialDiasRestantes <= 3 ? "rgba(224,72,72,0.12)" : "rgba(61, 181, 74,0.10)",
              border: `1px solid ${trialDiasRestantes <= 3 ? "rgba(224,72,72,0.3)" : "rgba(61, 181, 74,0.3)"}`,
              color: trialDiasRestantes <= 3 ? "#FFB4B4" : COLORS.accent,
            }}
          >
            <span><EmojiIcon e="🎁" /></span>
            <span className="flex-1">
              {trialDiasRestantes === 1
                ? "Último dia grátis! Escolha um plano →"
                : `${trialDiasRestantes} dias grátis restantes — Ver planos →`}
            </span>
          </Link>
        )}
        {corridasCiclo >= 15 && (
          <div
            className="mb-3 rounded-lg px-3 py-2 text-[12.5px] flex items-center gap-2"
            style={{ background: "rgba(224,72,72,0.12)", border: "1px solid rgba(224,72,72,0.3)", color: "#FFB4B4" }}
          >
            <span><EmojiIcon e="⚠️" /></span>
            <span>
              Faltam <strong>{20 - corridasCiclo}</strong> corrida{20 - corridasCiclo === 1 ? "" : "s"} para sua próxima cobrança ({valorCicloFmt})
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="relative">
            {moto?.foto_url ? (
              <img src={moto.foto_url} alt={moto.nome} className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: online ? COLORS.accent : "rgba(255,255,255,0.1)" }} />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: "#2A3942" }}><EmojiIcon e="🏍️" /></div>
            )}
            {online && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2"
                style={{ background: COLORS.accent, borderColor: COLORS.bg, animation: "pulse 2s ease-in-out infinite" }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[17px] truncate" style={{ color: COLORS.text }}>{moto?.nome}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${planoInfo.color}22`, color: planoInfo.color, border: `1px solid ${planoInfo.color}55` }}
              >
                {planoInfo.label}
              </span>
              <span className="text-[12px]" style={{ color: COLORS.textDim }}>
                {online ? "Online" : "Offline"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <IOSSwitch checked={online} onChange={toggleOnline} disabled={busy} ariaLabel="Online" />
          </div>
        </div>

        {/* Card aceitar PEGUE ALI */}
        <div
          className="mt-3 rounded-xl p-4 flex items-center gap-3"
          style={{ background: COLORS.card, boxShadow: CARD_SHADOW }}
        >
          <div className="text-2xl" aria-hidden><EmojiIcon e="📦" /></div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px]">Aceitar PEGUE ALI</div>
            <div className="text-[12px]" style={{ color: COLORS.textDim }}>
              Receba pedidos de encomenda/retirada
            </div>
          </div>
          <IOSSwitch checked={aceitaPegueAli} onChange={togglePegueAli} ariaLabel="Aceitar Pegue Ali" />
        </div>
      </header>

      {/* CONTEÚDO */}
      <div key={aba} className="animate-in fade-in duration-150">
        {aba === "corridas" && (
          atual ? (
            atual.tipo === "pegue_ali" ? (
              <PegueAliAtual
                atual={atual}
                passageiro={passageiro}
                busy={busy}
                now={now}
                onAvancar={avancarStatusEncomenda}
                onConfirmarRetirada={confirmarRetirada}
                onProdutoIndisponivel={marcarProdutoIndisponivel}
                onProporValor={proporNovoValorProduto}
                onNinguemRecebe={iniciarTimerNinguemRecebe}
                onConcluir={abrirConfirmar}
              />
            ) : (
              <CorridaAtual
                atual={atual}
                passageiro={passageiro}
                chegou={chegou}
                busy={busy}
                onChegou={marcarChegou}
                onIniciar={iniciar}
                onConcluir={abrirConfirmar}
              />
            )
          ) : online ? (
            corridasVisiveis.length === 0 ? (
              <EmptyState
                icon=""
                pulse
                title="Procurando corridas disponíveis..."
                subtitle="Você será notificado assim que houver uma nova solicitação na sua área."
              />
            ) : (
              <section className="px-5 mt-5 space-y-3">
                <h2 className="font-semibold text-[15px]" style={{ color: COLORS.textDim }}>
                  {corridasVisiveis.length} {corridasVisiveis.length === 1 ? "corrida disponível" : "corridas disponíveis"}
                </h2>
                {corridasVisiveis.map((c) => {
                  const seg = c.criado_em ? Math.max(0, Math.floor((now - new Date(c.criado_em).getTime()) / 1000)) : 0;
                  const distPickup =
                    minhaPos && c.origem_lat != null && c.origem_lng != null
                      ? haversineKm(minhaPos, { lat: c.origem_lat, lng: c.origem_lng })
                      : null;
                  const isPegue = c.tipo === "pegue_ali";
                  return (
                    <div key={c.id} className="rounded-xl p-4 space-y-3" style={{ background: COLORS.card, boxShadow: CARD_SHADOW }}>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            background: isPegue ? "rgba(255,200,0,0.15)" : "rgba(61, 181, 74,0.12)",
                            color: isPegue ? "#FFC800" : COLORS.accent,
                            border: `1px solid ${isPegue ? "rgba(255,200,0,0.4)" : "rgba(61, 181, 74,0.4)"}`,
                          }}
                        >
                          {isPegue ? "PEGUE ALI" : "CORRIDA"}
                        </span>
                        <span className="text-[11px]" style={{ color: COLORS.textDim }}>há {seg}s</span>
                      </div>
                      <div className="space-y-1.5 text-[14px]">
                        <div className="flex gap-2"><span><EmojiIcon e="📍" /></span><span className="flex-1">Bairro {c.bairro_origem ?? "—"}</span></div>
                        <div className="flex gap-2"><span><EmojiIcon e="🏁" /></span><span className="flex-1">Bairro {c.bairro_destino ?? "—"}</span></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[12px]" style={{ color: COLORS.textDim }}>
                            {c.distancia_km} km{distPickup !== null ? ` · ${distPickup} km de você` : ""}
                          </div>
                          <div className="font-bold text-lg" style={{ color: COLORS.accent }}>
                            {formatBRL(c.valor_estimado)}
                          </div>
                        </div>
                        <button
                          onClick={() => aceitar(c)}
                          disabled={busy}
                          className="px-5 py-3 rounded-xl font-bold text-[15px] disabled:opacity-60"
                          style={{ background: COLORS.accent, color: "#0F0F10", boxShadow: "0 4px 12px rgba(0,168,132,0.35)" }}
                        >
                          ACEITAR
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>
            )
          ) : (
            <EmptyState
              icon=""
              title="Você está offline"
              subtitle="Ative o switch ONLINE no topo para começar a receber corridas."
            />
          )
        )}

        {aba === "financeiro" && (
          <section className="px-5 mt-5 space-y-3">
            {/* Filtros de período */}
            <div className="flex gap-2 flex-wrap">
              {([
                { id: "hoje", label: "Hoje" },
                { id: "semana", label: "Esta semana" },
                { id: "mes", label: "Este mês" },
                { id: "custom", label: "Customizado" },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltroPeriodo(f.id)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                  style={filtroPeriodo === f.id
                    ? { background: COLORS.accent, color: "#0F0F10" }
                    : { background: "rgba(255,255,255,0.08)", color: COLORS.textDim }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {filtroPeriodo === "custom" && (
              <div className="flex gap-2">
                <input type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-[14px]" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, color: COLORS.text }} />
                <input type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-[14px]" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, color: COLORS.text }} />
              </div>
            )}

            {/* Total do período em destaque */}
            <div className="rounded-xl p-5" style={{ background: COLORS.card, boxShadow: CARD_SHADOW, border: `1px solid ${COLORS.accent}` }}>
              <div className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.textDim }}>Total recebido no período</div>
              <div className="mt-1 font-bold text-3xl" style={{ color: COLORS.accent }}>
                {formatBRL(ganhosCorridas)}
              </div>
              <div className="mt-2 text-[11px]" style={{ color: COLORS.textDim }}>
                {itensPeriodo.length} corrida(s) · pagamento direto com o passageiro (dinheiro/Pix pessoal)
              </div>
            </div>

            {/* Lista de corridas do período */}
            <h2 className="font-semibold text-[18px] pt-2">Corridas do período</h2>
            {itensPeriodo.length === 0 ? (
              <div className="rounded-xl p-4 text-center text-[13px]" style={{ background: COLORS.card, color: COLORS.textDim, boxShadow: CARD_SHADOW }}>
                Nenhuma corrida concluída neste período.
              </div>
            ) : (
              <div className="space-y-2">
                {itensPeriodo.map((it) => {
                  const badge =
                    it.tipo === "pegue_ali" ? { label: "PEGUE ALI", emoji: "", cor: "#FFC107" }
                    : { label: "Corrida", emoji: "", cor: COLORS.accent };
                  const d = new Date(it.data);
                  return (
                    <div key={`${it.tipo}-${it.id}`} className="rounded-xl p-3 flex justify-between items-center gap-3" style={{ background: COLORS.card, boxShadow: CARD_SHADOW }}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${badge.cor}22`, color: badge.cor, border: `1px solid ${badge.cor}55` }}>
                            {badge.emoji} {badge.label}
                          </span>
                          <span className="text-[11px]" style={{ color: COLORS.textDim }}>
                            {d.toLocaleDateString("pt-BR")} · {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="mt-1 text-[14px] font-semibold truncate">{it.nome}</div>
                      </div>
                      <div className="font-bold text-[16px]" style={{ color: COLORS.accent }}>
                        {formatBRL(it.valor)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-xl p-3 text-[11px] text-center" style={{ background: "rgba(255,255,255,0.04)", color: COLORS.textDim, border: `1px dashed ${COLORS.border}` }}>
              <EmojiIcon e="💡" /> Você recebe direto do passageiro em dinheiro ou no seu Pix pessoal. O app não intermedia pagamentos por enquanto.
            </div>


            {moto?.plano === "ouro" ? (
              <div className="rounded-xl p-4 space-y-3 border" style={{ background: COLORS.card, borderColor: "rgba(255,215,0,0.4)", boxShadow: CARD_SHADOW }}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold"><EmojiIcon e="📄" /> Exportar relatório PDF</h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700" }}>OURO</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(["semana","mes","personalizado"] as const).map((p) => (
                    <button
                      key={p} onClick={() => setExportPeriodo(p)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                      style={exportPeriodo === p
                        ? { background: COLORS.accent, color: "#0F0F10" }
                        : { background: "rgba(255,255,255,0.08)", color: COLORS.textDim }}
                    >
                      {p === "semana" ? "Semana" : p === "mes" ? "Mês" : "Personalizado"}
                    </button>
                  ))}
                </div>
                {exportPeriodo === "personalizado" && (
                  <div className="flex gap-2">
                    <input type="date" value={exportInicio} onChange={(e) => setExportInicio(e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-[14px]" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, color: COLORS.text }} />
                    <input type="date" value={exportFim} onChange={(e) => setExportFim(e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-[14px]" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, color: COLORS.text }} />
                  </div>
                )}
                <button
                  disabled={exportando}
                  onClick={async () => {
                    if (!user) return;
                    setExportando(true);
                    try {
                      const agora = new Date();
                      let inicio: Date, fim: Date, rotulo: string;
                      if (exportPeriodo === "semana") {
                        fim = agora; inicio = new Date(agora.getTime() - 7 * 24 * 3600 * 1000);
                        rotulo = "Últimos 7 dias";
                      } else if (exportPeriodo === "mes") {
                        inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
                        fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
                        rotulo = inicio.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                      } else {
                        if (!exportInicio || !exportFim) { toast.error("Selecione as datas"); setExportando(false); return; }
                        inicio = new Date(exportInicio + "T00:00:00");
                        fim = new Date(exportFim + "T23:59:59");
                        rotulo = `${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}`;
                      }
                      const { data: rows, error } = await supabase
                        .from("corridas")
                        .select("criado_em,origem_endereco,destino_endereco,valor_final,valor_estimado,distancia_km")
                        .eq("mototaxista_id", user.id).eq("status", "concluida")
                        .gte("criado_em", inicio.toISOString()).lte("criado_em", fim.toISOString())
                        .order("criado_em", { ascending: true });
                      if (error) throw error;
                      const corridas: CorridaRel[] = (rows ?? []).map((r: any) => ({
                        data: r.criado_em, origem: r.origem_endereco ?? "", destino: r.destino_endereco ?? "",
                        valor: Number(r.valor_final ?? r.valor_estimado ?? 0), distancia_km: r.distancia_km ?? null,
                      }));
                      const periodo: PeriodoRel = { inicio, fim, rotulo };
                      await gerarRelatorioPdf({
                        nomeMototaxista: moto?.nome ?? "Mototaxista", periodo, corridas,
                      });
                      toast.success("Relatório gerado!");
                    } catch (e: any) {
                      toast.error(e?.message ?? "Erro ao gerar relatório");
                    } finally {
                      setExportando(false);
                    }
                  }}
                  className="btn-cta w-full"
                >
                  {exportando ? "Gerando..." : "Exportar PDF"}
                </button>
              </div>
            ) : (
              <div className="rounded-xl p-4 text-center text-[13px]" style={{ background: COLORS.card, color: COLORS.textDim, boxShadow: CARD_SHADOW }}>
                <EmojiIcon e="📄" /> Relatório PDF disponível no <span style={{ color: "#FFD700" }} className="font-bold">plano Ouro</span>
              </div>
            )}
          </section>
        )}


        {aba === "perfil" && moto && (
          <section className="px-5 mt-5 space-y-4">
            <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: COLORS.card, boxShadow: CARD_SHADOW }}>
              {moto.foto_url ? (
                <img src={moto.foto_url} alt={moto.nome} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: "#2A3942" }}><EmojiIcon e="🏍️" /></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[17px] truncate">{moto.nome}</div>
                <div className="text-[13px]" style={{ color: COLORS.textDim }}>{formatarTelefone(moto.telefone)}</div>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${planoInfo.color}22`, color: planoInfo.color, border: `1px solid ${planoInfo.color}55` }}>
                  {planoInfo.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Corridas" value={String(moto.total_corridas ?? 0)} />
              <StatBox label="Avaliação" value={moto.avaliacao_media ? moto.avaliacao_media.toFixed(1) + " " : "—"} />
              <StatBox label="Na plataforma" value={tempoNaPlataforma(moto.created_at)} />
            </div>

            {/* Preferências de aceite */}
            <div className="rounded-xl p-5 space-y-5" style={{ background: COLORS.card, boxShadow: CARD_SHADOW }}>
              <div>
                <div className="font-semibold text-[15px]">Preferências de aceite</div>
                <div className="text-[12px]" style={{ color: COLORS.textDim }}>
                  Só recebe corridas dentro dos seus limites.
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px]" style={{ color: COLORS.textDim }}>
                    Distância máxima de aceite
                  </label>
                  <span className="text-[14px] font-bold">{prefDistanciaKm} km</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={prefDistanciaKm}
                  onChange={(e) => setPrefDistanciaKm(Number(e.target.value))}
                  onMouseUp={() => salvarPreferencias({ distancia_max_km: prefDistanciaKm })}
                  onTouchEnd={() => salvarPreferencias({ distancia_max_km: prefDistanciaKm })}
                  disabled={savingPrefs}
                  className="w-full accent-[color:var(--tw-neon,#3DB54A)]"
                />
                <div className="flex justify-between text-[11px]" style={{ color: COLORS.textDim }}>
                  <span>1 km</span><span>15 km</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px]" style={{ color: COLORS.textDim }}>
                  Valor mínimo de corrida
                </label>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "#2A3942" }}>
                  <span className="text-[14px] font-bold">R$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={prefValorMinimo}
                    onChange={(e) => setPrefValorMinimo(Number(e.target.value) || 0)}
                    onBlur={() => salvarPreferencias({ valor_minimo: prefValorMinimo })}
                    className="flex-1 bg-transparent outline-none text-[15px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[14px]">Só corridas na minha cidade</div>
                  <div className="text-[11px]" style={{ color: COLORS.textDim }}>
                    Bloqueia chamados de cidades vizinhas
                  </div>
                </div>
                <IOSSwitch
                  checked={prefSoCidade}
                  onChange={() => {
                    const novo = !prefSoCidade;
                    setPrefSoCidade(novo);
                    salvarPreferencias({ so_cidade: novo });
                  }}
                  ariaLabel="Só corridas na minha cidade"
                />
              </div>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ background: COLORS.card, boxShadow: CARD_SHADOW }}>
              <SettingsRow icon="" label="Editar perfil" onClick={() => toast.info("Em breve")} />
              <SettingsRow icon="" label="Meus documentos (CNH)" onClick={() => navigate({ to: "/mototaxista/documentos" })} />

              <SettingsRow icon="" label="Meus dados bancários / Pix" onClick={() => toast.info("Em breve")} />
              <SettingsRow icon="" label="Ajuda e suporte" onClick={() => toast.info("Em breve")} />
              <SettingsRow icon="ℹ️" label="Sobre o InterGO" onClick={() => toast.info("InterGO v1.0")} last />
            </div>

            <button
              onClick={() => setConfirmLogout(true)}
              className="w-full py-3 rounded-xl font-semibold text-[15px]"
              style={{ background: "rgba(224,72,72,0.1)", color: COLORS.danger, border: "1px solid rgba(224,72,72,0.3)" }}
            >
              Sair da conta
            </button>
          </section>
        )}
      </div>

      {/* TAB BAR */}
      <TabBar<Aba>
        active={aba}
        onChange={setAba}
        tabs={[
          { id: "corridas", label: "Corridas", icon: "" },
          { id: "financeiro", label: "Financeiro", icon: "" },
          { id: "perfil", label: "Perfil", icon: "" },
        ]}
      />

      {user && atual && (atual.status === "aceita" || atual.status === "em_andamento") && (
        <>
          <ChatFab onClick={() => setChatOpen(true)} />
          {chatOpen && (
            <ChatCorrida
              corridaId={atual.id}
              meuId={user.id}
              meuTipo="mototaxista"
              outro={{
                nome: passageiro?.nome ?? "Passageiro",
                foto_url: passageiro?.foto_url ?? null,
                telefone: passageiro?.telefone ?? null,
                estrelas: null,
                status: atual.status === "em_andamento" ? "Em andamento" : chegou ? "Aguardando embarque" : "A caminho",
              }}
              onClose={() => setChatOpen(false)}
              onReportar={() => toast.info("Denúncia registrada — nossa equipe vai analisar.")}
            />
          )}
        </>
      )}

      {confirmConcluir && atual && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={() => !busy && setConfirmConcluir(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ background: COLORS.bg2 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Confirmar valor final</h3>
            <p className="text-[14px]" style={{ color: COLORS.textDim }}>Confirme o valor cobrado do passageiro. Será creditado na sua carteira.</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">R$</span>
              <input type="number" inputMode="decimal" step="0.01" min={0}
                value={valorFinalInput} onChange={(e) => setValorFinalInput(e.target.value)}
                className="flex-1 rounded-lg px-3 py-3 text-xl font-bold"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, color: COLORS.text }}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmConcluir(false)} disabled={busy} className="flex-1 py-3 rounded-lg font-semibold" style={{ background: "rgba(255,255,255,0.08)", color: COLORS.text }}>
                Cancelar
              </button>
              <button onClick={concluir} disabled={busy} className="flex-1 btn-cta">
                {busy ? "..." : "Concluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={() => setConfirmLogout(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ background: COLORS.bg2 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Sair da conta?</h3>
            <p className="text-[14px]" style={{ color: COLORS.textDim }}>Você precisará entrar novamente com seu telefone e PIN.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmLogout(false)} className="flex-1 py-3 rounded-lg font-semibold" style={{ background: "rgba(255,255,255,0.08)", color: COLORS.text }}>
                Cancelar
              </button>
              <button
                onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/splash" }))}
                className="flex-1 py-3 rounded-lg font-semibold"
                style={{ background: COLORS.danger, color: "#fff" }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar chave Pix */}
      {showPixCadastro && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowPixCadastro(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ background: COLORS.card, boxShadow: CARD_SHADOW }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-[18px]">Cadastrar chave Pix</h3>
            <p className="text-[13px]" style={{ color: COLORS.textDim }}>
              Você precisa cadastrar uma chave Pix antes de solicitar um saque.
            </p>
            <div className="space-y-2">
              <label className="text-[12px]" style={{ color: COLORS.textDim }}>Tipo de chave</label>
              <select
                value={novaChavePixTipo}
                onChange={(e) => setNovaChavePixTipo(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[14px]"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, color: COLORS.text }}
              >
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="telefone">Telefone</option>
                <option value="aleatoria">Aleatória</option>
              </select>
              <label className="text-[12px]" style={{ color: COLORS.textDim }}>Chave</label>
              <input
                value={novaChavePix}
                onChange={(e) => setNovaChavePix(e.target.value)}
                placeholder="Digite sua chave Pix"
                className="w-full rounded-lg px-3 py-2 text-[14px]"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, color: COLORS.text }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPixCadastro(false)}
                className="flex-1 py-2 rounded-lg font-semibold"
                style={{ background: "rgba(255,255,255,0.08)", color: COLORS.text }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!user) return;
                  const v = novaChavePix.trim();
                  if (v.length < 4) { toast.error("Chave inválida"); return; }
                  const { error } = await db
                    .from("mototaxistas")
                    .update({ chave_pix: v, chave_pix_tipo: novaChavePixTipo } as any)
                    .eq("id", user.id);
                  if (error) { toast.error(error.message); return; }
                  toast.success("Chave Pix cadastrada!");
                  setChavePix(v);
                  setChavePixTipo(novaChavePixTipo);
                  setShowPixCadastro(false);
                  setNovaChavePix("");
                }}
                className="flex-1 py-2 rounded-lg font-bold"
                style={{ background: COLORS.accent, color: "#0F0F10" }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Solicitar saque */}
      {showSaqueModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => !saqueBusy && setShowSaqueModal(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ background: COLORS.card, boxShadow: CARD_SHADOW }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-[18px]">Solicitar saque via Pix</h3>
            <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}` }}>
              <div className="text-[11px] uppercase" style={{ color: COLORS.textDim }}>Chave Pix cadastrada ({chavePixTipo})</div>
              <div className="text-[14px] font-semibold break-all">{chavePix}</div>
              <button
                onClick={() => { setShowSaqueModal(false); setShowPixCadastro(true); setNovaChavePix(chavePix ?? ""); setNovaChavePixTipo(chavePixTipo ?? "cpf"); }}
                className="text-[11px] mt-1 underline"
                style={{ color: COLORS.accent }}
              >
                Alterar chave
              </button>
            </div>
            <div>
              <div className="text-[11px]" style={{ color: COLORS.textDim }}>Saldo disponível</div>
              <div className="font-bold text-lg" style={{ color: COLORS.accent }}>{formatBRL(saldoDisponivel)}</div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px]" style={{ color: COLORS.textDim }}>Valor a sacar (mín. R$ 10,00)</label>
              <input
                type="number"
                min={10}
                step="0.01"
                value={valorSaqueInput}
                onChange={(e) => setValorSaqueInput(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-lg px-3 py-2 text-[16px] font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, color: COLORS.text }}
              />
            </div>
            <div className="flex gap-2">
              <button
                disabled={saqueBusy}
                onClick={() => setShowSaqueModal(false)}
                className="flex-1 py-2 rounded-lg font-semibold"
                style={{ background: "rgba(255,255,255,0.08)", color: COLORS.text }}
              >
                Cancelar
              </button>
              <button
                disabled={saqueBusy}
                onClick={async () => {
                  if (!user) return;
                  const v = Number(valorSaqueInput.replace(",", "."));
                  if (!Number.isFinite(v) || v < 10) { toast.error("Valor mínimo: R$ 10,00"); return; }
                  if (v > saldoDisponivel) { toast.error("Valor maior que o saldo disponível"); return; }
                  setSaqueBusy(true);
                  const { error } = await db.from("solicitacoes_saque").insert({
                    mototaxista_id: user.id,
                    valor: v,
                    tipo: "pix",
                    status: "pendente",
                    chave_pix: chavePix,
                    
                  } as any);
                  setSaqueBusy(false);
                  if (error) { toast.error(error.message); return; }
                  toast.success("Solicitação de saque enviada!");
                  setShowSaqueModal(false);
                  setValorSaqueInput("");
                  carregarFinanceiro();
                }}
                className="flex-1 py-2 rounded-lg font-bold"
                style={{ background: COLORS.accent, color: "#0F0F10" }}
              >
                {saqueBusy ? "Enviando..." : "CONFIRMAR SAQUE"}
              </button>
            </div>
          </div>
        </div>
      )}


      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.15); } }
        @keyframes pulseSoft { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.7; } }
      `}</style>
    </main>
  );
}

function EmptyState({
  icon, title, subtitle, pulse, action,
}: {
  icon: string;
  title: string;
  subtitle: string;
  pulse?: boolean;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <section className="px-6 mt-12 flex flex-col items-center text-center">
      <div
        className="text-[80px] leading-none mb-4"
        style={{ opacity: 0.4, animation: pulse ? "pulseSoft 2.4s ease-in-out infinite" : undefined }}
        aria-hidden
      >
        {icon}
      </div>
      <div className="text-[18px] font-semibold mb-2" style={{ color: COLORS.text }}>{title}</div>
      <div className="text-[14px] max-w-xs" style={{ color: COLORS.textDim }}>{subtitle}</div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-5 py-2.5 rounded-xl font-semibold text-[14px]"
          style={{ background: COLORS.accent, color: "#0F0F10", boxShadow: "0 4px 12px rgba(0,168,132,0.35)" }}
        >
          {action.label}
        </button>
      )}
    </section>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: COLORS.card, boxShadow: CARD_SHADOW }}>
      <div className="font-bold text-[16px]" style={{ color: COLORS.accent }}>{value}</div>
      <div className="text-[11px] mt-0.5" style={{ color: COLORS.textDim }}>{label}</div>
    </div>
  );
}

function SettingsRow({ icon, label, onClick, last }: { icon: string; label: string; onClick: () => void; last?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/5"
      style={{ borderBottom: last ? "none" : `1px solid ${COLORS.border}` }}
    >
      <span className="text-xl">{icon}</span>
      <span className="flex-1 text-[15px]" style={{ color: COLORS.text }}>{label}</span>
      <span style={{ color: COLORS.textDim }}>›</span>
    </button>
  );
}

function tempoNaPlataforma(created: string | null | undefined): string {
  if (!created) return "—";
  const ms = Date.now() - new Date(created).getTime();
  const dias = Math.floor(ms / (24 * 3600 * 1000));
  if (dias < 30) return `${dias}d`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `${meses} mes${meses > 1 ? "es" : ""}`;
  const anos = Math.floor(meses / 12);
  return `${anos} ano${anos > 1 ? "s" : ""}`;
}

function CorridaAtual({
  atual, passageiro, chegou, busy, onChegou, onIniciar, onConcluir,
}: {
  atual: Corrida;
  passageiro: Passageiro | null;
  chegou: boolean;
  busy: boolean;
  onChegou: () => void;
  onIniciar: () => void;
  onConcluir: () => void;
}) {
  return (
    <section className="px-5 mt-5">
      <div className="rounded-2xl p-5 space-y-4" style={{ background: COLORS.card, boxShadow: CARD_SHADOW }}>
        <div className="flex items-center gap-3">
          {passageiro?.foto_url
            ? <img src={passageiro.foto_url} className="w-14 h-14 rounded-full object-cover" />
            : <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: "#2A3942" }}><EmojiIcon e="🧑" /></div>}
          <div>
            <div className="font-bold text-[17px]">{passageiro?.nome ?? "Passageiro"}</div>
            <div className="text-[12px]" style={{ color: COLORS.textDim }}>{atual.status === "aceita" ? "A caminho" : "Em andamento"}</div>
          </div>
        </div>
        <div className="space-y-1 text-[14px]">
          <div><EmojiIcon e="🟢" /> {atual.origem_endereco}</div>
          <div><EmojiIcon e="🔴" /> {atual.destino_endereco}</div>
          <div className="mt-1 font-bold text-xl" style={{ color: COLORS.accent }}>
            {atual.eh_gratuita ? "GRÁTIS " : formatBRL(atual.valor_total_passageiro ?? atual.valor_estimado)}
          </div>
          {!atual.eh_gratuita && atual.valor_base_aplicado != null && atual.taxa_bora_ze_aplicada != null && (
            <div className="text-[11px] leading-tight" style={{ color: COLORS.textDim }}>
              Seu ganho: <strong style={{ color: COLORS.text }}>{formatBRL(atual.valor_base_aplicado)}</strong>
              {" · "}Taxa InterGO: {formatBRL(atual.taxa_bora_ze_aplicada)}
            </div>
          )}
          <div className="text-[12px]" style={{ color: COLORS.textDim }}>{atual.distancia_km} km</div>
        </div>
        {passageiro?.telefone && (
          <a href={whatsappLink(passageiro.telefone, "Olá, sou seu mototaxista do InterGO!") ?? "#"} target="_blank" rel="noreferrer" className="btn-cta w-full text-center block">
            <EmojiIcon e="💬" /> WhatsApp passageiro
          </a>
        )}
        {atual.status === "aceita" && !chegou && (
          <button onClick={onChegou} disabled={busy} className="btn-cta w-full">
            {busy ? "..." : "Cheguei ao passageiro"}
          </button>
        )}
        {atual.status === "aceita" && chegou && (
          <>
            <div className="rounded-xl p-3 text-center text-[14px]" style={{ background: "rgba(255,255,255,0.05)", color: COLORS.textDim }}>
              Aguardando passageiro embarcar…
            </div>
            <button onClick={onIniciar} disabled={busy} className="btn-cta w-full">
              {busy ? "..." : "▶️ Iniciar corrida"}
            </button>
          </>
        )}
        {atual.status === "em_andamento" && (
          <button onClick={onConcluir} disabled={busy} className="btn-cta w-full">
            <EmojiIcon e="✅" /> Concluir corrida
          </button>
        )}
      </div>
    </section>
  );
}

function PegueAliAtual({
  atual, passageiro, busy, now,
  onAvancar, onConfirmarRetirada, onProdutoIndisponivel, onProporValor, onNinguemRecebe, onConcluir,
}: {
  atual: Corrida;
  passageiro: Passageiro | null;
  busy: boolean;
  now: number;
  onAvancar: (s: NonNullable<Corrida["status_encomenda"]>) => void;
  onConfirmarRetirada: (fotoProduto: File, fotoPagamento?: File | null) => void;
  onProdutoIndisponivel: () => void;
  onProporValor: (v: number) => void;
  onNinguemRecebe: () => void;
  onConcluir: () => void;
}) {
  const [fotoProduto, setFotoProduto] = useState<File | null>(null);
  const [fotoPagamento, setFotoPagamento] = useState<File | null>(null);
  const [showValor, setShowValor] = useState(false);
  const [novoValor, setNovoValor] = useState("");
  const st = atual.status_encomenda ?? "a_caminho_loja";
  const precisaPagar = !!atual.pagamento_no_local;
  const valorProduto = atual.valor_produto_ajustado ?? atual.valor_pagamento_local ?? 0;

  const segTimer = atual.ninguem_recebe_iniciado_em
    ? Math.max(0, 300 - Math.floor((now - new Date(atual.ninguem_recebe_iniciado_em).getTime()) / 1000))
    : 0;

  return (
    <section className="px-5 mt-5 space-y-4">
      <div className="rounded-2xl p-5 space-y-4" style={{ background: COLORS.card, boxShadow: CARD_SHADOW }}>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
            style={{ background: "rgba(255,200,0,0.15)", color: "#FFC800", border: "1px solid rgba(255,200,0,0.4)" }}>
            <EmojiIcon e="📦" /> PEGUE ALI
          </span>
          <span className="text-[12px]" style={{ color: COLORS.textDim }}>{labelStatusEncomenda(st)}</span>
        </div>

        <div className="flex items-center gap-3">
          {passageiro?.foto_url
            ? <img src={passageiro.foto_url} className="w-12 h-12 rounded-full object-cover" />
            : <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: "#2A3942" }}><EmojiIcon e="🧑" /></div>}
          <div className="flex-1">
            <div className="font-bold">{passageiro?.nome ?? "Passageiro"}</div>
            {atual.em_nome_de && <div className="text-[12px]" style={{ color: COLORS.textDim }}>Em nome de: {atual.em_nome_de}</div>}
          </div>
        </div>

        <div className="space-y-2 text-[14px]">
          <div><span className="opacity-70"><EmojiIcon e="🏪" /> Buscar em:</span> <div className="font-medium">{atual.origem_endereco}</div></div>
          <div><span className="opacity-70"><EmojiIcon e="🎯" /> Entregar em:</span> <div className="font-medium">{atual.destino_endereco}</div></div>
          {atual.descricao && (
            <div><span className="opacity-70"><EmojiIcon e="📝" /> Item:</span> <div className="font-medium whitespace-pre-wrap">{atual.descricao}</div></div>
          )}
          {atual.foto_url && (
            <a href={atual.foto_url} target="_blank" rel="noreferrer" className="inline-block">
              <img src={atual.foto_url} className="w-24 h-24 rounded-lg object-cover mt-1" />
            </a>
          )}
          {precisaPagar && (
            <div className="rounded-lg p-3" style={{ background: "rgba(255,200,0,0.08)", border: "1px solid rgba(255,200,0,0.3)" }}>
              <EmojiIcon e="💰" /> <b>Pagar na hora:</b> {formatBRL(valorProduto)}
              {atual.valor_produto_ajustado != null && (
                <div className="text-[11px] mt-1" style={{ color: COLORS.textDim }}>(valor ajustado — aguardando ok do passageiro)</div>
              )}
            </div>
          )}
          <div className="font-bold text-xl pt-1" style={{ color: COLORS.accent }}>
            Ganho: {formatBRL(atual.valor_estimado)}
          </div>
        </div>

        {passageiro?.telefone && (
          <a href={whatsappLink(passageiro.telefone, "Olá! Sou o entregador do seu pedido no InterGO.") ?? "#"} target="_blank" rel="noreferrer" className="btn-cta w-full text-center block">
            <EmojiIcon e="💬" /> Falar com passageiro
          </a>
        )}

        {/* Botões sequenciais */}
        {st === "a_caminho_loja" && (
          <button onClick={() => onAvancar("na_loja")} disabled={busy} className="btn-cta w-full">
            <EmojiIcon e="🏪" /> Cheguei na loja
          </button>
        )}

        {st === "na_loja" && (
          <div className="space-y-2">
            <label className="block text-[13px]" style={{ color: COLORS.textDim }}>Foto do produto (obrigatória)</label>
            <input type="file" accept="image/*" capture="environment" onChange={(e) => setFotoProduto(e.target.files?.[0] ?? null)} className="w-full text-[13px]" />
            {precisaPagar && (
              <>
                <label className="block text-[13px] mt-2" style={{ color: COLORS.textDim }}>Foto do comprovante de pagamento</label>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => setFotoPagamento(e.target.files?.[0] ?? null)} className="w-full text-[13px]" />
              </>
            )}
            <button
              onClick={() => fotoProduto && onConfirmarRetirada(fotoProduto, precisaPagar ? fotoPagamento : null)}
              disabled={busy || !fotoProduto || (precisaPagar && !fotoPagamento)}
              className="btn-cta w-full disabled:opacity-50"
            >
              <EmojiIcon e="📸" /> Confirmar retirada
            </button>
          </div>
        )}

        {st === "a_caminho_destino" && (
          <button onClick={() => onAvancar("entregue")} disabled={busy} className="btn-cta w-full">
            <EmojiIcon e="🎯" /> Cheguei no destino
          </button>
        )}

        {st === "entregue" && (
          <button onClick={onConcluir} disabled={busy} className="btn-cta w-full">
            <EmojiIcon e="✅" /> Finalizar entrega
          </button>
        )}

        {st === "ninguem_recebe" && (
          <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)" }}>
            <EmojiIcon e="🚪" /> Ninguém para receber — aguardando: <b>{Math.floor(segTimer/60)}:{String(segTimer%60).padStart(2,"0")}</b>
            {segTimer === 0 && (
              <button onClick={onConcluir} className="btn-cta w-full mt-2"><EmojiIcon e="✅" /> Encerrar entrega</button>
            )}
          </div>
        )}

        {/* Aux */}
        {st !== "entregue" && st !== "ninguem_recebe" && (
          <div className="grid grid-cols-1 gap-2 pt-2">
            <button onClick={onProdutoIndisponivel} disabled={busy} className="text-[13px] py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: COLORS.text }}>
              <EmojiIcon e="❌" /> Produto indisponível
            </button>
            {precisaPagar && (
              <button onClick={() => setShowValor(true)} disabled={busy} className="text-[13px] py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: COLORS.text }}>
                <EmojiIcon e="💰" /> Valor mudou
              </button>
            )}
            {st === "a_caminho_destino" && (
              <button onClick={onNinguemRecebe} disabled={busy} className="text-[13px] py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: COLORS.text }}>
                <EmojiIcon e="🚪" /> Ninguém pra receber
              </button>
            )}
          </div>
        )}
      </div>

      {showValor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={() => setShowValor(false)}>
          <div className="rounded-2xl p-5 w-full max-w-sm space-y-3" style={{ background: COLORS.card }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Novo valor do produto</h3>
            <input type="number" step="0.01" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} placeholder="R$ 0,00" className="w-full p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "#fff" }} />
            <div className="flex gap-2">
              <button onClick={() => setShowValor(false)} className="flex-1 py-3 rounded-lg" style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>Cancelar</button>
              <button
                onClick={() => { const v = parseFloat(novoValor.replace(",", ".")); if (v > 0) { onProporValor(v); setShowValor(false); setNovoValor(""); } }}
                disabled={busy}
                className="flex-1 btn-cta"
              >Enviar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function labelStatusEncomenda(s: NonNullable<Corrida["status_encomenda"]>): string {
  switch (s) {
    case "a_caminho_loja": return "A caminho da loja";
    case "na_loja": return "Na loja";
    case "a_caminho_destino": return "A caminho do destino";
    case "entregue": return "Entregue";
    case "produto_indisponivel": return "Produto indisponível";
    case "valor_alterado_pendente": return "Valor alterado — aguardando";
    case "ninguem_recebe": return "Ninguém para receber";
    default: return s;
  }
}
