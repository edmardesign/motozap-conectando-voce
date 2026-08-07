import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_mototaxista_status",
  title: "Get mototaxista status",
  description:
    "For a signed-in mototaxista: current online status, active plan, commission cycle progress, and totals.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("mototaxistas")
      .select(
        "id, status, plano, plano_validade, aceita_delivery, mensalidade_ativa, total_corridas, corridas_desde_pagamento, conta_bloqueada_comissao, ultimo_pagamento_comissao, status_cadastro",
      )
      .eq("id", ctx.getUserId())
      .maybeSingle();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return {
        content: [
          {
            type: "text",
            text: "No mototaxista record for this user (are you signed in as a mototaxista?).",
          },
        ],
        isError: true,
      };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { mototaxista: data },
    };
  },
});
