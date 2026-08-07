// Helpers for phone+PIN auth (Bora Zé!)

export function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

/** Aplica máscara (XX) XXXXX-XXXX enquanto o usuário digita. */
export function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidPhone(v: string): boolean {
  return onlyDigits(v).length === 11;
}

export function isValidPin(v: string): boolean {
  return /^\d{4}$/.test(v);
}

/** Email interno usado pelo Supabase (não exposto ao usuário). */
export function phoneToEmail(phone: string): string {
  return `${onlyDigits(phone)}@motezap.app`;
}

/** Senha real enviada ao Supabase (>=6 chars). PIN do usuário fica de 4 dígitos. */
export function pinToPassword(pin: string): string {
  return `MZap-${pin}-Auth`;
}
