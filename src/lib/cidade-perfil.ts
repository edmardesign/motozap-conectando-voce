// Persistência da cidade escolhida pelo usuário no perfil (backend).
// A escolha acontece DEPOIS do cadastro, então sempre há sessão.
// Best-effort: se falhar, o app segue com a cidade salva localmente.
import { supabase } from "@/integrations/supabase/client";

/**
 * Grava a cidade escolhida no perfil do usuário autenticado.
 * Nunca lança: a UI não deve travar por causa disso.
 */
export async function salvarCidadeNoPerfil(uf: string, cidade: string): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    const { data: cidadeRow } = await supabase
      .from("cidades_configuradas")
      .select("id")
      .eq("estado", uf)
      .ilike("cidade", cidade)
      .maybeSingle();

    await supabase
      .from("profiles")
      .update({
        cidade,
        estado: uf,
        ...(cidadeRow?.id ? { cidade_id: cidadeRow.id } : {}),
      })
      .eq("id", uid);
  } catch {
    /* noop — persistência local já garante o fluxo */
  }
}
