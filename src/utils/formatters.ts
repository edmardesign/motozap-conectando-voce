// Formatadores de exibição — Bora Zé!
// Uso exclusivo de apresentação. Não altera lógica de negócio.

function digits(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

/**
 * Formata placa brasileira:
 * - Antiga (3 letras + 4 números): "ABC1234" → "ABC-1234"
 * - Mercosul (3L + 1N + 1L + 2N): "ABC1D23" → "ABC1D23"
 * Se não bater nenhum formato, retorna em UPPERCASE sem alteração.
 */
export function formatarPlaca(placa: string | null | undefined): string {
  if (!placa) return "";
  const p = placa.toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z]{3}[0-9]{4}$/.test(p)) return `${p.slice(0, 3)}-${p.slice(3)}`;
  if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(p)) return p;
  return p;
}

/** Formata telefone BR celular: 11 dígitos → "(75) 99988-7766". */
export function formatarTelefone(tel: string | null | undefined): string {
  const d = digits(tel);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel ?? "";
}

/** Formata CPF: 11 dígitos → "123.456.789-09". */
export function formatarCpf(cpf: string | null | undefined): string {
  const d = digits(cpf);
  if (d.length !== 11) return cpf ?? "";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Formata CNPJ: 14 dígitos → "12.345.678/0001-90". */
export function formatarCnpj(cnpj: string | null | undefined): string {
  const d = digits(cnpj);
  if (d.length !== 14) return cnpj ?? "";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Formata CPF ou CNPJ automaticamente pelo tamanho. */
export function formatarDocumento(doc: string | null | undefined): string {
  const d = digits(doc);
  if (d.length === 11) return formatarCpf(d);
  if (d.length === 14) return formatarCnpj(d);
  return doc ?? "";
}
