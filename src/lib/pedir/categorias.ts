// Categorias visuais do módulo Delivery (Bora Zé!).

import imgRestaurante from "@/assets/cat/restaurante.png";
import imgPizza from "@/assets/cat/pizza.png";
import imgHamburguer from "@/assets/cat/hamburguer.png";
import imgPastel from "@/assets/cat/pastel.png";
import imgLanche from "@/assets/cat/lanche.png";
import imgSorveteria from "@/assets/cat/sorveteria.png";
import imgDoces from "@/assets/cat/doces.png";
import imgNaturais from "@/assets/cat/naturais.png";
import imgAves from "@/assets/cat/aves.png";
import imgMarmitex from "@/assets/cat/marmitex.png";
import imgMexicana from "@/assets/cat/mexicana.png";
import imgSalgados from "@/assets/cat/salgados.png";
import imgChinesa from "@/assets/cat/chinesa.png";
import imgBebidas from "@/assets/cat/bebidas.png";
import imgGasAgua from "@/assets/cat/gas-agua.png";
import imgMercado from "@/assets/cat/mercado.png";
import imgFarmacias from "@/assets/cat/farmacias.png";
import imgPet from "@/assets/cat/pet.png";

export interface CategoriaItem {
  id: string;
  label: string;
  emoji: string;
  /** Foto ilustrativa (PNG com fundo transparente) usada nos cartões coloridos. */
  img: string;
}

/** Categorias exibidas no topo da home do delivery. */
export const CATEGORIAS_TOPO: CategoriaItem[] = [
  { id: "farmacias", label: "Farmácias", emoji: "💊", img: imgFarmacias },
  { id: "gas-agua", label: "Gás e Água", emoji: "🚰", img: imgGasAgua },
  { id: "bebidas", label: "Bebidas", emoji: "🥤", img: imgBebidas },
  { id: "mercado", label: "Mercado", emoji: "🧺", img: imgMercado },
];

/** Lista completa, aberta ao tocar em "Ver tudo". */
export const CATEGORIAS_TODAS: CategoriaItem[] = [
  { id: "restaurante", label: "Restaurante", emoji: "🍽️", img: imgRestaurante },
  { id: "pizza", label: "Pizza", emoji: "🍕", img: imgPizza },
  { id: "hamburguer", label: "Hambúrguer", emoji: "🍔", img: imgHamburguer },
  { id: "pastel", label: "Pastel", emoji: "🥐", img: imgPastel },
  { id: "lanche", label: "Lanche", emoji: "🥪", img: imgLanche },
  { id: "sorveteria", label: "Sorveteria", emoji: "🍦", img: imgSorveteria },
  { id: "doces", label: "Doces e Confeitarias", emoji: "🧁", img: imgDoces },
  { id: "naturais", label: "Prod. Naturais", emoji: "🥗", img: imgNaturais },
  { id: "aves", label: "Aves", emoji: "🍗", img: imgAves },
  { id: "marmitex", label: "Marmitex", emoji: "🍛", img: imgMarmitex },
  { id: "mexicana", label: "Mexicana", emoji: "🌮", img: imgMexicana },
  { id: "salgados", label: "Salgados", emoji: "🥟", img: imgSalgados },
  { id: "chinesa", label: "Chinesa", emoji: "🍜", img: imgChinesa },
  { id: "bebidas", label: "Bebidas", emoji: "🥤", img: imgBebidas },
  { id: "gas-agua", label: "Gás e Água", emoji: "🚰", img: imgGasAgua },
  { id: "mercado", label: "Mercado", emoji: "🧺", img: imgMercado },
  { id: "farmacias", label: "Farmácias", emoji: "💊", img: imgFarmacias },
  { id: "pet", label: "Pet", emoji: "🐾", img: imgPet },
];

/** Paleta vibrante rotativa dos cartões de categoria. */
export const CATEGORIA_CORES = ["#F27B21", "#F2559B", "#E4003D", "#0A5C40"] as const;
