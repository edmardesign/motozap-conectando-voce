// Persistência local da cidade escolhida pelo usuário (antes do login).
// Guardado em localStorage para sobreviver entre sessões.
//
// IMPORTANTE: só consideramos válido um registro com `explicit: true` e
// schema atual, gravado exclusivamente após uma ação explícita do usuário
// (clique na lista). Isso descarta automaticamente qualquer valor
// residual de versões anteriores que possa ter ficado no storage do
// navegador — evitando que o app abra com uma cidade "pré-selecionada".

const KEY = "boraze.cidade";
const SCHEMA_VERSION = 2;

export type CidadeEscolhida = {
  uf: string;
  cidade: string;
  escolhida_em: string; // ISO
  explicit: true;
  v: number;
};

export function getCidadeLocal(): CidadeEscolhida | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CidadeEscolhida>;
    if (
      !parsed?.uf ||
      !parsed?.cidade ||
      parsed.explicit !== true ||
      parsed.v !== SCHEMA_VERSION
    ) {
      // Registro inválido ou legado (sem escolha explícita) → remove.
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* noop */
      }
      return null;
    }
    return parsed as CidadeEscolhida;
  } catch {
    return null;
  }
}

export function setCidadeLocal(uf: string, cidade: string): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CidadeEscolhida = {
      uf,
      cidade,
      escolhida_em: new Date().toISOString(),
      explicit: true,
      v: SCHEMA_VERSION,
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* noop */
  }
}

export function clearCidadeLocal(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
