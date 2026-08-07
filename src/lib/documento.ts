// Validação e máscara de CPF/CNPJ em um único campo.

export function onlyDigitsDoc(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

export type TipoDocumento = "cpf" | "cnpj";

/** Detecta tipo pelo tamanho dos dígitos. Padrão: cpf enquanto <= 11. */
export function detectTipoDocumento(v: string): TipoDocumento {
  return onlyDigitsDoc(v).length > 11 ? "cnpj" : "cpf";
}

/** Formata dinamicamente: CPF até 11 dígitos, CNPJ a partir de 12. */
export function maskDocumento(v: string): string {
  const d = onlyDigitsDoc(v).slice(0, 14);
  if (d.length <= 11) {
    // CPF: XXX.XXX.XXX-XX
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  // CNPJ: XX.XXX.XXX/XXXX-XX
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}${d.length > 12 ? `-${d.slice(12, 14)}` : ""}`;
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (factor - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === parseInt(cpf[9], 10) && d2 === parseInt(cpf[10], 10);
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(cnpj.slice(0, 12), w1);
  const d2 = calc(cnpj.slice(0, 13), w2);
  return d1 === parseInt(cnpj[12], 10) && d2 === parseInt(cnpj[13], 10);
}

/** Valida CPF (11 dígitos) OU CNPJ (14 dígitos) com dígitos verificadores. */
export function isValidDocumento(v: string): boolean {
  const d = onlyDigitsDoc(v);
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}
