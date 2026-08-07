// Guarda a "intenção de serviço" do usuário durante o fluxo de cadastro/login.
// Ex.: usuário clica em DELIVERY na tela de serviços da cidade → guardamos
// "/pedir" para que, ao concluir o cadastro, ele seja levado direto ao serviço
// que motivou o cadastro.

const KEY = "boraze.intent";

export type ServiceIntent = "delivery" | "mercado" | "mototaxi";

const DESTINOS: Record<ServiceIntent, string> = {
  delivery: "/pedir",
  mercado: "/mercado",
  mototaxi: "/passageiro/home",
};

const LABELS: Record<ServiceIntent, string> = {
  delivery: "IR PARA DELIVERY",
  mercado: "IR PARA MERCADO",
  mototaxi: "CHAMAR MEU PRIMEIRO MOTOTAXI",
};

export function setServiceIntent(intent: ServiceIntent): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, intent);
  } catch {
    /* noop */
  }
}

export function getServiceIntent(): ServiceIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === "delivery" || raw === "mercado" || raw === "mototaxi") return raw;
    return null;
  } catch {
    return null;
  }
}

export function clearServiceIntent(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function destinoDoIntent(intent: ServiceIntent | null): string {
  if (!intent) return "/escolher";
  return DESTINOS[intent];
}

export function labelDoIntent(intent: ServiceIntent | null): string {
  if (!intent) return "COMEÇAR";
  return LABELS[intent];
}

/**
 * Resolve destino a partir de um `?next` explícito (search param) ou do
 * intent salvo em sessionStorage. Fallback: `/escolher`.
 */
export function resolverDestinoPosCadastro(nextParam?: string | null): string {
  if (nextParam && nextParam.startsWith("/")) return nextParam;
  const intent = getServiceIntent();
  return destinoDoIntent(intent);
}
