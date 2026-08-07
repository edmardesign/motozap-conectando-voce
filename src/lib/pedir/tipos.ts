// Tipos de domínio do módulo Delivery (Bora Zé!).
// Alimentados a partir das tabelas food_* do Supabase.

export interface Adicional {
  id: string;
  nome: string;
  preco: number;
}

export interface Produto {
  id: string;
  lojaId: string;
  nome: string;
  descricao: string;
  preco: number;
  precoDe?: number;
  imagem?: string;
  destaque?: boolean;
  categoriaId?: string | null;
  categoriaNome?: string;
  adicionais?: Adicional[];
}

export interface Loja {
  id: string;
  nome: string;
  categoria: string;
  imagem?: string;
  logo?: string;
  avaliacao: number;
  tempoMin: number;
  tempoMax: number;
  taxa: number;
  aberto: boolean;
  pausado: boolean;
  promo?: string | null;
  tags: string[];
  endereco?: string | null;
  bairro?: string | null;
  cidadeId?: string | null;
}
