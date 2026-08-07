// InterGO pricing helpers — agora baseado em tarifa fixa por horário + adicional de bairro.
// As funções de cálculo por km foram removidas; o backend calcula via RPC calcular_valor_corrida.

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function digitsOnly(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const d = digitsOnly(phone);
  if (d.length < 10) return null;
  const full = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

export function formatHora(hhmmss: string | null | undefined): string {
  if (!hhmmss) return "";
  return hhmmss.slice(0, 5).replace(":", "h");
}
