import type { Database } from "@/integrations/supabase/types";
import type { Loja, Produto, Adicional } from "./tipos";

type LojaRow = Database["public"]["Tables"]["mercado_lojas"]["Row"];
type ProdutoRow = Database["public"]["Tables"]["mercado_produtos"]["Row"];
type AdicionalRow = Database["public"]["Tables"]["mercado_adicionais"]["Row"];

export function mapLoja(r: LojaRow): Loja {
  return {
    id: r.id,
    nome: r.nome,
    categoria: r.categoria,
    imagem: r.imagem_capa_url ?? undefined,
    logo: r.logo_url ?? undefined,
    avaliacao: Number(r.avaliacao ?? 0),
    tempoMin: r.tempo_preparo_min,
    tempoMax: r.tempo_preparo_max,
    taxa: Number(r.taxa_entrega ?? 0),
    aberto: r.aberto,
    pausado: r.pausado,
    promo: r.promo_destaque,
    tags: r.tags ?? [],
    endereco: r.endereco,
    bairro: r.bairro,
    cidadeId: r.cidade_id,
  };
}

export function mapProduto(
  r: ProdutoRow,
  categoriasPorId?: Record<string, string>,
  adicionais?: AdicionalRow[]
): Produto {
  return {
    id: r.id,
    lojaId: r.loja_id,
    nome: r.nome,
    descricao: r.descricao ?? "",
    preco: Number(r.preco),
    precoDe: r.preco_de != null ? Number(r.preco_de) : undefined,
    imagem: r.imagem_url ?? undefined,
    destaque: r.destaque,
    categoriaId: r.categoria_id,
    categoriaNome: r.categoria_id ? categoriasPorId?.[r.categoria_id] : undefined,
    adicionais: adicionais?.map(
      (a): Adicional => ({ id: a.id, nome: a.nome, preco: Number(a.preco) })
    ),
  };
}
