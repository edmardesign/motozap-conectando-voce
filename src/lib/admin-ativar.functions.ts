// Ativação administrativa por código de 6 dígitos.
// Fluxo:
//   1. Admin principal gera o código via `gerarCodigoAtivacao` (exibido 1x na UI).
//   2. Admin repassa o código ao subadmin/embaixador por canal seguro.
//   3. O subadmin/embaixador abre /admin, escolhe "Ativar meu acesso" e informa
//      telefone + código + PIN de 4 dígitos.
//   4. Esta server fn (pública, sem sessão) valida o código via RPC bcrypt
//      SECURITY DEFINER, define a senha do usuário (=PIN) via supabaseAdmin e
//      retorna o e-mail sintético para o cliente executar signInWithPassword.
//
// Segurança:
//   - RPC valida bcrypt, expiração 24h, bloqueio após 5 tentativas.
//   - EXECUTE do RPC concedido apenas a service_role (fora do alcance de anon).
//   - Não retorna dados internos: só `{ ok, email }` ou erro genérico.

import { createServerFn } from "@tanstack/react-start";

function onlyDigits(v: string) { return (v || "").replace(/\D/g, ""); }

export const ativarAcessoAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { telefone: string; codigo: string; pin: string }) => d)
  .handler(async ({ data }) => {
    const telefone = onlyDigits(data.telefone);
    const codigo = (data.codigo || "").trim();
    const pin = (data.pin || "").trim();

    if (telefone.length < 10) throw new Error("Telefone inválido.");
    if (!/^\d{6}$/.test(codigo)) throw new Error("Código deve ter 6 dígitos.");
    if (!/^\d{4}$/.test(pin)) throw new Error("PIN deve ter 4 dígitos numéricos.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rpc, error } = await supabaseAdmin.rpc("admin_ativar_por_codigo", {
      _telefone: telefone,
      _codigo: codigo,
    });
    if (error) throw new Error("Falha ao validar código.");

    const resp = rpc as { ok: boolean; erro?: string; user_id?: string; tentativas_restantes?: number } | null;
    if (!resp?.ok) {
      if (resp?.erro === "bloqueado") {
        throw new Error("Código bloqueado após muitas tentativas. Solicite um novo ao administrador.");
      }
      const rest = resp?.tentativas_restantes;
      throw new Error(
        typeof rest === "number"
          ? `Código inválido ou expirado. Tentativas restantes: ${rest}.`
          : "Código inválido ou expirado.",
      );
    }

    const userId = resp.user_id!;
    // Define o PIN como senha do usuário. Isso permite login via signInWithPassword.
    const { error: uErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: pin,
    });
    if (uErr) throw new Error("Falha ao definir PIN.");

    const email = `${telefone}@motezap.app`;
    return { ok: true, email };
  });
