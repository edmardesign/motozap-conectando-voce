// Persistência da cidade escolhida pelo usuário no perfil (backend).
// A escolha acontece DEPOIS do cadastro, então sempre há sessão.
// Best-effort: se falhar, o app segue com a cidade salva localmente.
import { supabase } from "@/integrations/supabase/client";

export type ServicosCidade = {
  delivery_ativo: boolean;
  mercado_ativo: boolean;
  mototaxi_ativo: boolean;
  cidade_cadastrada: boolean;
};

/**
 * Busca a configuração de serviços de uma cidade (tabela pública,
 * somente leitura via RLS). Cidade não cadastrada → nada disponível.
 */
export async function buscarServicosDaCidade(
  uf: string,
  cidade: string,
): Promise<ServicosCidade> {
  const { data } = await supabase
    .from("cidades_configuradas")
    .select("id, delivery_ativo, mercado_ativo, mototaxi_ativo, ativa")
    .eq("estado", uf)
    .ilike("cidade", cidade)
    .eq("ativa", true)
    .maybeSingle();

  if (!data) {
    return {
      delivery_ativo: false,
      mercado_ativo: false,
      mototaxi_ativo: false,
      cidade_cadastrada: false,
    };
  }
  return {
    delivery_ativo: !!data.delivery_ativo,
    mercado_ativo: !!data.mercado_ativo,
    mototaxi_ativo: !!data.mototaxi_ativo,
    cidade_cadastrada: true,
  };
}

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
