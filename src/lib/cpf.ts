// Validação local de CPF + utilitários

export function onlyDigitsCpf(v: string): string {
  return v.replace(/\D/g, "");
}

export function maskCpf(v: string): string {
  const d = onlyDigitsCpf(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Mascara para logs (mostra só primeiros 3 e últimos 2 dígitos). */
export function maskCpfForLog(v: string): string {
  const d = onlyDigitsCpf(v);
  if (d.length !== 11) return "***.***.***-**";
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

/** Valida dígitos verificadores do CPF. */
export function isValidCpf(v: string): boolean {
  const cpf = onlyDigitsCpf(v);
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
