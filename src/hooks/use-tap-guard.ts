import { useCallback, useEffect, useRef } from "react";

/**
 * Evita "ghost taps": em navegações mobile o toque que ocorreu na tela
 * anterior pode disparar um clique na tela recém-montada (mesma posição),
 * fazendo o app "pular" de tela sem o usuário escolher nada.
 *
 * Uso:
 *   const ready = useTapGuard();      // 500ms por padrão
 *   onClick={() => { if (!ready()) return; ... }}
 */
export function useTapGuard(delayMs = 600): () => boolean {
  const mountedAt = useRef<number>(0);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  return useCallback(() => {
    if (mountedAt.current === 0) return false;
    return Date.now() - mountedAt.current >= delayMs;
  }, [delayMs]);
}
