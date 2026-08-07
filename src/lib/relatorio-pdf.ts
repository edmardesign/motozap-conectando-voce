// Geração de relatório PDF financeiro (plano Ouro).
// Header com logo + nome + período, resumo, gráfico de barras por dia, lista, rodapé.

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "@/assets/motozap-logo.png.asset.json";

export type CorridaRel = {
  data: string; // ISO
  origem: string;
  destino: string;
  valor: number;
  distancia_km?: number | null;
};

export type PeriodoRel = {
  inicio: Date;
  fim: Date;
  rotulo: string;
};

const NEON = "#00FF1A";
const BG = "#000000";

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR");
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function agruparPorDia(corridas: CorridaRel[]): { label: string; valor: number }[] {
  const map = new Map<string, number>();
  for (const c of corridas) {
    const key = fmtData(c.data);
    map.set(key, (map.get(key) ?? 0) + c.valor);
  }
  return Array.from(map.entries())
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => {
      const [da, ma, ya] = a.label.split("/").map(Number);
      const [dbb, mb, yb] = b.label.split("/").map(Number);
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, dbb).getTime();
    });
}

function desenharGrafico(
  doc: jsPDF,
  serie: { label: string; valor: number }[],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  // moldura
  doc.setDrawColor(60);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
  if (serie.length === 0) {
    doc.setTextColor(120);
    doc.setFontSize(10);
    doc.text("Sem corridas no período", x + w / 2, y + h / 2, { align: "center" });
    return;
  }
  const max = Math.max(...serie.map((s) => s.valor), 1);
  const padX = 8;
  const padTop = 6;
  const padBottom = 12;
  const innerW = w - padX * 2;
  const innerH = h - padTop - padBottom;
  const barW = Math.max(2, (innerW / serie.length) * 0.7);
  const gap = innerW / serie.length;

  doc.setFillColor(NEON);
  doc.setTextColor(80);
  doc.setFontSize(7);
  serie.forEach((s, i) => {
    const barH = (s.valor / max) * innerH;
    const bx = x + padX + gap * i + (gap - barW) / 2;
    const by = y + padTop + (innerH - barH);
    doc.rect(bx, by, barW, barH, "F");
    // label dia (D/M)
    const dm = s.label.split("/").slice(0, 2).join("/");
    doc.text(dm, bx + barW / 2, y + h - 3, { align: "center" });
  });
}

export async function gerarRelatorioPdf(opts: {
  nomeMototaxista: string;
  periodo: PeriodoRel;
  corridas: CorridaRel[];
}): Promise<void> {
  const { nomeMototaxista, periodo, corridas } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Fundo header
  doc.setFillColor(BG);
  doc.rect(0, 0, pageW, 32, "F");

  // Logo
  const logo = await loadImageAsDataUrl(logoAsset.url);
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 10, 6, 36, 20, undefined, "FAST");
    } catch {
      /* fallback ignora logo */
    }
  }

  // Texto header
  doc.setTextColor(NEON);
  doc.setFontSize(16);
  doc.text("Relatório Financeiro", 52, 14);
  doc.setTextColor(255);
  doc.setFontSize(10);
  doc.text(nomeMototaxista, 52, 20);
  doc.setTextColor(200);
  doc.text(`Período: ${periodo.rotulo}`, 52, 25);
  doc.text(`${fmtData(periodo.inicio)} → ${fmtData(periodo.fim)}`, 52, 29);

  // Resumo
  const total = corridas.reduce((s, c) => s + c.valor, 0);
  const km = corridas.reduce((s, c) => s + (c.distancia_km ?? 0), 0);
  const ticket = corridas.length > 0 ? total / corridas.length : 0;

  let y = 42;
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text("Resumo do período", 10, y);
  y += 6;

  const cardW = (pageW - 30) / 4;
  const cards = [
    { label: "Corridas", value: String(corridas.length) },
    { label: "Total ganho", value: fmtBRL(total) },
    { label: "KM estimado", value: `${km.toFixed(1)} km` },
    { label: "Ticket médio", value: fmtBRL(ticket) },
  ];
  doc.setDrawColor(220);
  cards.forEach((c, i) => {
    const x = 10 + (cardW + 3) * i;
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(x, y, cardW, 20, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(c.label, x + 3, y + 6);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(c.value, x + 3, y + 14);
  });
  y += 28;

  // Gráfico
  doc.setFontSize(12);
  doc.text("Ganhos por dia", 10, y);
  y += 4;
  desenharGrafico(doc, agruparPorDia(corridas), 10, y, pageW - 20, 50);
  y += 56;

  // Tabela
  autoTable(doc, {
    startY: y,
    head: [["Data", "Origem", "Destino", "Valor"]],
    body: corridas.map((c) => [
      fmtData(c.data),
      c.origem ?? "-",
      c.destino ?? "-",
      fmtBRL(c.valor),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [0, 0, 0], textColor: [0, 255, 26] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 10, right: 10 },
  });

  // Rodapé em todas as páginas
  const total_pages = doc.getNumberOfPages();
  for (let i = 1; i <= total_pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130);
    const ts = new Date().toLocaleString("pt-BR");
    doc.text(`Gerado pelo Bora Zé! em ${ts}`, 10, pageH - 6);
    doc.text(`${i}/${total_pages}`, pageW - 10, pageH - 6, { align: "right" });
  }

  const fname = `motozap-relatorio-${periodo.rotulo.replace(/\s+/g, "_")}.pdf`;
  doc.save(fname);
}
