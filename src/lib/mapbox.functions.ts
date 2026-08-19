import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getMapboxToken = createServerFn({ method: "GET" })
  .handler(async () => {
    const token = process.env.VITE_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;
    return { token: token || null };
  });

export const updateMapboxToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string() }).parse(data))
  .handler(async ({ data }) => {
    return { success: true, token: data.token };
  });
