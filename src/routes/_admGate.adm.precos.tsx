import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listarConfiguracoesTarifarias,
  listarBairros,
  listarRegrasPreco,
  definirTaxaGlobal,
  definirTaxaCidade,
  cadastrarBairro,
  criarRegraPreco,
  ativarRegraPreco,
  previewCalculo,
} from "@/lib/precos.functions";

export const Route = createFileRoute("/_admGate/adm/precos")({
  component: PrecosPage,
});

type Cidade = { id: string; estado: string; cidade: string; ativa: boolean };
type Config = {
  id: string; cidade_id: string | null; taxa_bora_ze: number; valor_base: number | null;
  inicio_vigencia: string; fim_vigencia: string | null; ativo: boolean; versao: number;
  justificativa: string;
};
type Bairro = { id: string; cidade_id: string; nome: string; nome_normalizado: string; aliases: string[]; ativo: boolean };
type Regra = {
  id: string; cidade_id: string;
  bairro_origem_id: string | null; bairro_destino_id: string | null;
  tipo_aplicacao: "origem" | "destino" | "origem_ou_destino" | "rota";
  valor_base: number; prioridade: number; ativo: boolean;
  inicio_vigencia: string; fim_vigencia: string | null; justificativa: string;
};

const brl = (v: number | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PrecosPage() {
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [cidadeSel, setCidadeSel] = useState<string | null>(null);
  const [isPrincipal, setIsPrincipal] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregarCfg = useServerFn(listarConfiguracoesTarifarias);

  useEffect(() => {
    (async () => {
      const db = supabase as any;
      const { data: cs } = await db.from("cidades_configuradas").select("*").order("cidade");
      setCidades(cs ?? []);
      const { data: princ } = await db.rpc("me_is_admin_principal");
      setIsPrincipal(!!princ);
      const list = await carregarCfg();
      setConfigs(list as Config[]);
      setLoading(false);
    })();
  }, []);

  const cfgGlobal = useMemo(
    () => configs.find((c) => c.cidade_id == null && c.ativo) ?? null,
    [configs],
  );
  const cfgPorCidade = useMemo(() => {
    const map: Record<string, Config> = {};
    for (const c of configs) {
      if (c.cidade_id && c.ativo && !map[c.cidade_id]) map[c.cidade_id] = c;
    }
    return map;
  }, [configs]);

  async function refetch() {
    const list = await carregarCfg();
    setConfigs(list as Config[]);
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center bg-background text-white">Carregando…</main>;
  }

  return (
    <main className="min-h-screen bg-background text-white pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Preços e tarifas</h1>
            <p className="text-xs text-white/60">Taxa InterGO, valor-base por cidade e regras por bairro.</p>
          </div>
          <Link to="/adm/gestao" className="text-sm text-white/70 underline">Voltar</Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {isPrincipal && (
          <TaxaGlobalCard cfg={cfgGlobal} onSaved={refetch} />
        )}

        <div className="rounded-2xl bg-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="font-bold">Configuração por cidade</h2>
            <select
              className="input-mz max-w-xs"
              value={cidadeSel ?? ""}
              onChange={(e) => setCidadeSel(e.target.value || null)}
            >
              <option value="">Selecione uma cidade…</option>
              {cidades.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cidade} — {c.estado} {c.ativa ? "" : "(suspensa)"}
                </option>
              ))}
            </select>
          </div>

          {!cidadeSel && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cidades.map((c) => {
                const cfg = cfgPorCidade[c.id];
                return (
                  <button
                    key={c.id}
                    onClick={() => setCidadeSel(c.id)}
                    className="text-left rounded-xl bg-black/40 border border-white/10 p-4 hover:border-neon transition"
                  >
                    <div className="flex justify-between">
                      <div className="font-bold">{c.cidade} · {c.estado}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${c.ativa ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                        {c.ativa ? "ativa" : "suspensa"}
                      </span>
                    </div>
                    <div className="text-xs text-white/60 mt-2">
                      Valor-base: <b className="text-white">{brl(cfg?.valor_base)}</b>
                    </div>
                    <div className="text-xs text-white/60">
                      Taxa: <b className="text-white">{brl(cfg?.taxa_bora_ze ?? cfgGlobal?.taxa_bora_ze)}</b>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {cidadeSel && (
            <CidadePanel
              cidade={cidades.find((c) => c.id === cidadeSel)!}
              cfgAtiva={cfgPorCidade[cidadeSel] ?? cfgGlobal ?? null}
              onClose={() => setCidadeSel(null)}
              onSaved={refetch}
            />
          )}
        </div>

        <div className="rounded-2xl bg-card p-5">
          <h2 className="font-bold mb-3">Histórico de tarifas</h2>
          <div className="space-y-2 max-h-96 overflow-auto">
            {configs.map((c) => (
              <div key={c.id} className="text-sm border border-white/10 rounded-lg px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 items-center">
                <span className={`text-[10px] px-2 py-0.5 rounded ${c.ativo ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/50"}`}>
                  {c.ativo ? "vigente" : "encerrada"}
                </span>
                <span className="font-bold">
                  {c.cidade_id ? cidades.find((x) => x.id === c.cidade_id)?.cidade ?? "?" : "Global"}
                </span>
                <span>Taxa: <b>{brl(c.taxa_bora_ze)}</b></span>
                {c.valor_base != null && <span>Base: <b>{brl(c.valor_base)}</b></span>}
                <span className="text-white/60">v{c.versao}</span>
                <span className="text-white/60">{new Date(c.inicio_vigencia).toLocaleString("pt-BR")}</span>
                <span className="text-white/50 basis-full text-xs">📝 {c.justificativa}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

/* ================= TAXA GLOBAL ================= */
function TaxaGlobalCard({ cfg, onSaved }: { cfg: Config | null; onSaved: () => void }) {
  const [taxa, setTaxa] = useState(cfg?.taxa_bora_ze?.toString() ?? "0.50");
  const [justificativa, setJustificativa] = useState("");
  const [saving, setSaving] = useState(false);
  const saveFn = useServerFn(definirTaxaGlobal);

  async function save() {
    const t = Number(taxa.replace(",", "."));
    if (!Number.isFinite(t) || t < 0) return toast.error("Taxa inválida.");
    if (justificativa.trim().length < 3) return toast.error("Justificativa obrigatória.");
    if (t > 5 && !confirm(`Confirmar taxa global de ${brl(t)}? Isso afetará TODAS as cidades sem taxa própria.`)) return;
    setSaving(true);
    try {
      await saveFn({ data: { taxa: t, justificativa } });
      toast.success("Taxa global atualizada");
      setJustificativa("");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-card p-5 border border-neon/30">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">Taxa global InterGO</h2>
        <div className="text-3xl font-extrabold text-neon">{brl(cfg?.taxa_bora_ze ?? 0.5)}</div>
      </div>
      <p className="text-xs text-white/60 mt-1">Padrão aplicado quando a cidade não tem taxa própria configurada.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <div>
          <label className="text-xs text-white/60">Nova taxa (R$)</label>
          <input className="input-mz" inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-white/60">Justificativa</label>
          <input className="input-mz" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Ex: reajuste operacional trimestral" />
        </div>
      </div>
      <button className="btn-cta mt-3" onClick={save} disabled={saving}>
        {saving ? "Salvando…" : "Aplicar taxa global"}
      </button>
    </div>
  );
}

/* ================= PAINEL POR CIDADE ================= */
function CidadePanel({
  cidade, cfgAtiva, onClose, onSaved,
}: { cidade: Cidade; cfgAtiva: Config | null; onClose: () => void; onSaved: () => void }) {
  const [aba, setAba] = useState<"tarifa" | "bairros" | "regras" | "simular">("tarifa");

  return (
    <div className="rounded-xl bg-black/40 border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">{cidade.cidade} · {cidade.estado}</h3>
          <p className="text-xs text-white/60">
            Vigente: base {brl(cfgAtiva?.valor_base)} + taxa {brl(cfgAtiva?.taxa_bora_ze)} = {brl((cfgAtiva?.valor_base ?? 0) + (cfgAtiva?.taxa_bora_ze ?? 0))}
          </p>
        </div>
        <button className="text-sm text-white/70 underline" onClick={onClose}>× Fechar</button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(["tarifa", "bairros", "regras", "simular"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
              aba === a ? "bg-neon text-neon-foreground font-bold" : "bg-white/10 text-white/80"
            }`}
          >
            {a === "tarifa" && "Tarifa"}
            {a === "bairros" && "Bairros"}
            {a === "regras" && "Regras de preço"}
            {a === "simular" && "Simular"}
          </button>
        ))}
      </div>

      {aba === "tarifa" && <TarifaCidadeForm cidade={cidade} cfg={cfgAtiva} onSaved={onSaved} />}
      {aba === "bairros" && <BairrosPanel cidade={cidade} />}
      {aba === "regras" && <RegrasPanel cidade={cidade} />}
      {aba === "simular" && <SimuladorPanel cidade={cidade} />}
    </div>
  );
}

function TarifaCidadeForm({ cidade, cfg, onSaved }: { cidade: Cidade; cfg: Config | null; onSaved: () => void }) {
  const [taxa, setTaxa] = useState(cfg?.taxa_bora_ze?.toString() ?? "0.50");
  const [base, setBase] = useState(cfg?.valor_base?.toString() ?? "6.00");
  const [just, setJust] = useState("");
  const [saving, setSaving] = useState(false);
  const saveFn = useServerFn(definirTaxaCidade);

  async function save() {
    const t = Number(taxa.replace(",", "."));
    const b = Number(base.replace(",", "."));
    if (!Number.isFinite(t) || t < 0) return toast.error("Taxa inválida.");
    if (!Number.isFinite(b) || b < 0) return toast.error("Valor-base inválido.");
    if (just.trim().length < 3) return toast.error("Justificativa obrigatória.");
    setSaving(true);
    try {
      await saveFn({ data: { cidade_id: cidade.id, taxa: t, valor_base: b, justificativa: just } });
      toast.success("Tarifa da cidade atualizada");
      setJust("");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/60">Valor-base (R$)</label>
          <input className="input-mz" inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-white/60">Taxa InterGO (R$)</label>
          <input className="input-mz" inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs text-white/60">Justificativa</label>
        <input className="input-mz" value={just} onChange={(e) => setJust(e.target.value)} placeholder="Ex: novo custo operacional" />
      </div>
      <div className="text-xs text-white/60">
        Passageiro pagará: <b className="text-neon">{brl((Number(base.replace(",", ".")) || 0) + (Number(taxa.replace(",", ".")) || 0))}</b>
      </div>
      <button className="btn-cta" onClick={save} disabled={saving}>{saving ? "Salvando…" : "Aplicar"}</button>
    </div>
  );
}

/* ================= BAIRROS ================= */
function BairrosPanel({ cidade }: { cidade: Cidade }) {
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [nome, setNome] = useState("");
  const [aliases, setAliases] = useState("");
  const fetchFn = useServerFn(listarBairros);
  const cadastrarFn = useServerFn(cadastrarBairro);

  async function refresh() {
    const b = await fetchFn({ data: { cidade_id: cidade.id } });
    setBairros(b as Bairro[]);
  }
  useEffect(() => { refresh(); }, [cidade.id]);

  async function add() {
    if (nome.trim().length < 2) return toast.error("Nome inválido.");
    try {
      await cadastrarFn({ data: {
        cidade_id: cidade.id,
        nome: nome.trim(),
        aliases: aliases.split(",").map((s) => s.trim()).filter(Boolean),
      }});
      toast.success("Bairro cadastrado");
      setNome(""); setAliases("");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input className="input-mz" placeholder="Nome do bairro" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input className="input-mz sm:col-span-2" placeholder="Apelidos, separados por vírgula" value={aliases} onChange={(e) => setAliases(e.target.value)} />
      </div>
      <button className="btn-cta" onClick={add}>+ Cadastrar bairro</button>
      <div className="max-h-72 overflow-auto space-y-1">
        {bairros.map((b) => (
          <div key={b.id} className="text-sm bg-black/30 border border-white/10 rounded-lg px-3 py-2 flex justify-between">
            <div>
              <div className="font-bold">{b.nome}</div>
              {b.aliases.length > 0 && <div className="text-xs text-white/60">↔ {b.aliases.join(", ")}</div>}
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded ${b.ativo ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
              {b.ativo ? "ativo" : "inativo"}
            </span>
          </div>
        ))}
        {bairros.length === 0 && <p className="text-sm text-white/50">Nenhum bairro cadastrado.</p>}
      </div>
    </div>
  );
}

/* ================= REGRAS ================= */
function RegrasPanel({ cidade }: { cidade: Cidade }) {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [tipo, setTipo] = useState<Regra["tipo_aplicacao"]>("origem_ou_destino");
  const [origem, setOrigem] = useState<string>("");
  const [destino, setDestino] = useState<string>("");
  const [valor, setValor] = useState("");
  const [prio, setPrio] = useState("100");
  const [just, setJust] = useState("");

  const fetchR = useServerFn(listarRegrasPreco);
  const fetchB = useServerFn(listarBairros);
  const criarFn = useServerFn(criarRegraPreco);
  const ativarFn = useServerFn(ativarRegraPreco);

  async function refresh() {
    const [r, b] = await Promise.all([
      fetchR({ data: { cidade_id: cidade.id } }),
      fetchB({ data: { cidade_id: cidade.id } }),
    ]);
    setRegras(r as Regra[]);
    setBairros(b as Bairro[]);
  }
  useEffect(() => { refresh(); }, [cidade.id]);

  async function salvar() {
    const v = Number(valor.replace(",", "."));
    const p = Number(prio);
    if (!Number.isFinite(v) || v < 0) return toast.error("Valor-base inválido.");
    if (just.trim().length < 3) return toast.error("Justificativa obrigatória.");
    if (tipo === "rota" && (!origem || !destino)) return toast.error("Selecione bairro de origem e destino.");
    if ((tipo === "origem" || tipo === "origem_ou_destino") && !origem) return toast.error("Selecione bairro de origem.");
    if (tipo === "destino" && !destino) return toast.error("Selecione bairro de destino.");

    try {
      await criarFn({ data: {
        cidade_id: cidade.id,
        bairro_origem_id: (tipo === "destino") ? null : (origem || null),
        bairro_destino_id: (tipo === "origem") ? null : (destino || null),
        tipo_aplicacao: tipo,
        valor_base: v,
        prioridade: p,
        justificativa: just,
      }});
      toast.success("Regra criada");
      setShowForm(false); setValor(""); setJust(""); setOrigem(""); setDestino("");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  async function toggle(r: Regra) {
    try {
      await ativarFn({ data: { id: r.id, ativo: !r.ativo } });
      refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  const nomeB = (id: string | null) => bairros.find((b) => b.id === id)?.nome ?? "—";

  return (
    <div className="space-y-3">
      <button className="btn-cta" onClick={() => setShowForm((s) => !s)}>
        {showForm ? "Cancelar" : "+ Nova regra de preço"}
      </button>

      {showForm && (
        <div className="rounded-xl bg-black/50 border border-white/10 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-white/60">Aplicação</label>
              <select className="input-mz" value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
                <option value="origem">Quando bairro for a origem</option>
                <option value="destino">Quando bairro for o destino</option>
                <option value="origem_ou_destino">Origem ou destino</option>
                <option value="rota">Rota específica origem → destino</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/60">Valor-base (R$)</label>
              <input className="input-mz" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            {(tipo === "origem" || tipo === "origem_ou_destino" || tipo === "rota") && (
              <div>
                <label className="text-xs text-white/60">Bairro de origem</label>
                <select className="input-mz" value={origem} onChange={(e) => setOrigem(e.target.value)}>
                  <option value="">Selecione…</option>
                  {bairros.filter((b) => b.ativo).map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
                </select>
              </div>
            )}
            {(tipo === "destino" || tipo === "rota") && (
              <div>
                <label className="text-xs text-white/60">Bairro de destino</label>
                <select className="input-mz" value={destino} onChange={(e) => setDestino(e.target.value)}>
                  <option value="">Selecione…</option>
                  {bairros.filter((b) => b.ativo).map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-white/60">Prioridade (menor = maior prioridade)</label>
              <input className="input-mz" type="number" value={prio} onChange={(e) => setPrio(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-white/60">Justificativa</label>
              <input className="input-mz" value={just} onChange={(e) => setJust(e.target.value)} />
            </div>
          </div>
          <button className="btn-cta" onClick={salvar}>Salvar regra</button>
        </div>
      )}

      <div className="max-h-80 overflow-auto space-y-1">
        {regras.map((r) => (
          <div key={r.id} className="text-sm bg-black/30 border border-white/10 rounded-lg px-3 py-2 flex justify-between items-center">
            <div>
              <div className="font-bold">
                {r.tipo_aplicacao === "rota"
                  ? `${nomeB(r.bairro_origem_id)} → ${nomeB(r.bairro_destino_id)}`
                  : r.tipo_aplicacao === "origem"
                  ? `Origem: ${nomeB(r.bairro_origem_id)}`
                  : r.tipo_aplicacao === "destino"
                  ? `Destino: ${nomeB(r.bairro_destino_id)}`
                  : `Origem ou destino: ${nomeB(r.bairro_origem_id)}`}
              </div>
              <div className="text-xs text-white/60">
                Base: <b className="text-white">{brl(r.valor_base)}</b> · Prio: {r.prioridade}
              </div>
            </div>
            <button
              onClick={() => toggle(r)}
              className={`text-[10px] px-2 py-1 rounded ${r.ativo ? "bg-green-500/30 text-green-200" : "bg-white/10 text-white/60"}`}
            >
              {r.ativo ? "ativa · desativar" : "inativa · ativar"}
            </button>
          </div>
        ))}
        {regras.length === 0 && <p className="text-sm text-white/50">Nenhuma regra cadastrada.</p>}
      </div>
    </div>
  );
}

/* ================= SIMULADOR ================= */
function SimuladorPanel({ cidade }: { cidade: Cidade }) {
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [origem, setOrigem] = useState<string>("");
  const [destino, setDestino] = useState<string>("");
  const [resultado, setResultado] = useState<{
    valor_base: number; taxa_bora_ze: number; valor_total: number;
  } | null>(null);
  const fetchB = useServerFn(listarBairros);
  const previewFn = useServerFn(previewCalculo);

  useEffect(() => {
    (async () => {
      const b = await fetchB({ data: { cidade_id: cidade.id } });
      setBairros(b as Bairro[]);
    })();
  }, [cidade.id]);

  async function simular() {
    try {
      const r = await previewFn({ data: {
        cidade_id: cidade.id,
        bairro_origem_id: origem || null,
        bairro_destino_id: destino || null,
      }});
      setResultado(r as any);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-white/60">Origem</label>
          <select className="input-mz" value={origem} onChange={(e) => setOrigem(e.target.value)}>
            <option value="">— sem bairro específico —</option>
            {bairros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/60">Destino</label>
          <select className="input-mz" value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="">— sem bairro específico —</option>
            {bairros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>
      </div>
      <button className="btn-cta" onClick={simular}>Calcular prévia</button>
      {resultado && resultado.valor_total != null && (
        <div className="rounded-xl border border-neon/30 bg-black/50 p-4 space-y-1">
          <div className="text-sm">Base aplicável: <b>{brl(resultado.valor_base)}</b></div>
          <div className="text-sm">Taxa InterGO: <b>{brl(resultado.taxa_bora_ze)}</b></div>
          <div className="text-lg font-extrabold text-neon">Passageiro paga {brl(resultado.valor_total)}</div>
          <div className="text-xs text-white/60">Mototaxista recebe {brl(resultado.valor_base)}</div>
        </div>
      )}
    </div>
  );
}
