// Server function para validação de CPF.
// Atualmente faz validação local de dígitos verificadores e registra log de auditoria.
// Estrutura preparada para integrar com API externa (Serpro, ReceitaWS etc.) no futuro:
// - cpf_valido: dígitos válidos
// - cpf_nome_confere: nome da Receita bate com o informado (após integração)
// - cpf_validado_em: timestamp da validação contra a fonte externa

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidCpf, onlyDigitsCpf, maskCpfForLog } from "@/lib/cpf";

export type ValidarCpfResult = {
  cpf_valido: boolean;
  cpf_nome_confere: boolean | null;
  cpf_validado_em: string | null;
  origem: "local" | "api_externa";
  motivo?: string;
};

export const validarCpf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cpf: string; nome?: string }) => ({
    cpf: String(input?.cpf ?? ""),
    nome: typeof input?.nome === "string" ? input.nome : undefined,
  }))
  .handler(async ({ data, context }): Promise<ValidarCpfResult> => {
    const cpfDigits = onlyDigitsCpf(data.cpf);
    const cpfOk = isValidCpf(cpfDigits);

    const result: ValidarCpfResult = {
      cpf_valido: cpfOk,
      cpf_nome_confere: null, // só preenchido quando integrarmos API externa
      cpf_validado_em: null,
      origem: "local",
      motivo: cpfOk ? "Dígitos verificadores válidos" : "CPF inválido",
    };

    // Log de auditoria
    try {
      await context.supabase.from("cpf_validacao_log").insert({
        user_id: context.userId,
        cpf_mascarado: maskCpfForLog(cpfDigits),
        origem: result.origem,
        sucesso: result.cpf_valido,
        resultado: JSON.parse(JSON.stringify(result)),
      });
    } catch {
      // log é best-effort, não bloqueia o fluxo
    }

    return result;
  });
