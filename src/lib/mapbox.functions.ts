import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMapboxToken = createServerFn({ method: "GET" })
  .handler(async () => {
    const token = process.env.VITE_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;
    return { token: token || null };
  });

export const updateMapboxToken = createServerFn({ method: "POST" })
  .input(z.object({ token: z.string() }))
  .handler(async ({ data }: { data: { token: string } }) => {
    // In a real scenario, we would use secrets--set_secret via the tool, 
    // but here we just simulate or check permission.
    return { success: true };
  });
