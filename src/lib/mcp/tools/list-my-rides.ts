import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_rides",
  title: "List my rides",
  description:
    "List the signed-in user's most recent InterGO rides (as passenger or mototaxista). Ordered newest first.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of rides to return (default 10, max 50)."),
    status: z
      .string()
      .optional()
      .describe(
        "Optional exact status filter (e.g. 'pendente', 'aceita', 'em_andamento', 'concluida', 'cancelada').",
      ),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    let query = supabase
      .from("corridas")
      .select(
        "id, status, origem_endereco, destino_endereco, valor_estimado, valor_final, distancia_km, criado_em, cidade, passageiro_id, mototaxista_id",
      )
      .or(`passageiro_id.eq.${userId},mototaxista_id.eq.${userId}`)
      .order("criado_em", { ascending: false })
      .limit(limit ?? 10);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [
        { type: "text", text: JSON.stringify(data ?? [], null, 2) },
      ],
      structuredContent: { rides: data ?? [] },
    };
  },
});
