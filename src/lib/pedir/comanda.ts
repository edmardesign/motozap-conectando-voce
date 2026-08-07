// Impressão de comanda em impressora térmica 80mm.
// Abre uma janela em branco com HTML formatado e dispara window.print().

import type { Database } from "@/integrations/supabase/types";

type PedidoRow = Database["public"]["Tables"]["food_pedidos"]["Row"];
type ItemRow = Database["public"]["Tables"]["food_pedido_itens"]["Row"];

interface DadosComanda {
  pedido: PedidoRow;
  itens: ItemRow[];
  clienteNome?: string | null;
  lojaNome?: string | null;
}

const FORMA_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  carteira: "Carteira Bora Zé!",
};

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function money(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function imprimirComanda({ pedido, itens, clienteNome, lojaNome }: DadosComanda): void {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) {
    alert("Habilite pop-ups para imprimir a comanda.");
    return;
  }

  const dataStr = new Date(pedido.created_at).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  const itensHtml = itens
    .map((it) => {
      const adicionais = Array.isArray(it.adicionais)
        ? (it.adicionais as { nome?: string }[])
            .map((a) => (a?.nome ? `<div class="add">+ ${esc(a.nome)}</div>` : ""))
            .join("")
        : "";
      const obs = it.observacao ? `<div class="obs">Obs: ${esc(it.observacao)}</div>` : "";
      return `
        <div class="item">
          <div class="row">
            <span class="qtd">${it.quantidade}x</span>
            <span class="nome">${esc(it.nome_snapshot)}</span>
            <span class="val">${money(Number(it.subtotal))}</span>
          </div>
          ${adicionais}
          ${obs}
        </div>`;
    })
    .join("");

  const enderecoBairro = pedido.bairro_entrega ? ` — ${esc(pedido.bairro_entrega)}` : "";
  const complemento = pedido.complemento ? `<div>${esc(pedido.complemento)}</div>` : "";
  const trocoLinha =
    pedido.forma_pagamento === "dinheiro" && pedido.troco_para
      ? `<div>Troco para: ${money(Number(pedido.troco_para))}</div>`
      : "";
  const desconto =
    Number(pedido.desconto ?? 0) > 0
      ? `<div class="row"><span>Desconto</span><span>- ${money(Number(pedido.desconto))}</span></div>`
      : "";
  const obsPedido = pedido.observacao
    ? `<div class="block"><b>Observação:</b><br/>${esc(pedido.observacao)}</div>`
    : "";

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Comanda #${pedido.numero_pedido}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    width: 80mm;
    font-family: "Menlo","Consolas","Courier New",monospace;
    font-size: 12px;
    color: #000;
    background: #fff;
    padding: 6mm 4mm;
    line-height: 1.35;
  }
  h1 { font-size: 16px; margin: 0 0 2mm; text-align: center; letter-spacing: 1px; }
  h2 { font-size: 13px; margin: 3mm 0 1mm; text-transform: uppercase; }
  hr { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
  .center { text-align: center; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .qtd { flex: 0 0 auto; font-weight: bold; }
  .nome { flex: 1 1 auto; }
  .val { flex: 0 0 auto; font-variant-numeric: tabular-nums; }
  .item { margin: 1.5mm 0; }
  .add { padding-left: 10mm; font-size: 11px; }
  .obs { padding-left: 10mm; font-size: 11px; font-style: italic; }
  .block { margin: 2mm 0; }
  .total { font-size: 15px; font-weight: bold; }
  @media print { body { padding: 4mm 3mm; } }
</style></head>
<body>
  <h1>BORA ZÉ!</h1>
  <div class="center">${esc(lojaNome ?? "")}</div>
  <div class="center">${esc(dataStr)}</div>
  <hr/>
  <div class="center"><b>PEDIDO #${pedido.numero_pedido}</b></div>
  <hr/>
  <h2>Cliente</h2>
  <div>${esc(clienteNome ?? "Cliente")}</div>
  <h2>Entrega</h2>
  <div>${esc(pedido.endereco_entrega)}${enderecoBairro}</div>
  ${complemento}
  <hr/>
  <h2>Itens</h2>
  ${itensHtml}
  <hr/>
  <div class="row"><span>Subtotal</span><span>${money(Number(pedido.subtotal))}</span></div>
  <div class="row"><span>Entrega</span><span>${money(Number(pedido.taxa_entrega))}</span></div>
  ${desconto}
  <div class="row total"><span>TOTAL</span><span>${money(Number(pedido.total))}</span></div>
  <hr/>
  <h2>Pagamento</h2>
  <div>${esc(FORMA_LABEL[pedido.forma_pagamento] ?? pedido.forma_pagamento)}</div>
  ${trocoLinha}
  ${obsPedido}
  <hr/>
  <div class="center">-- Bora Zé! Delivery --</div>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
      setTimeout(function(){ window.close(); }, 400);
    };
  </script>
</body></html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}
