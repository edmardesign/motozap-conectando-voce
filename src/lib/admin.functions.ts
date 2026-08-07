import { createServerFn } from "@tanstack/react-start";

// Placeholder — será reimplementado na rodada 4 (painel admin) com o novo schema PT.
export const adminFetchDashboard = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async () => ({
    metrics: { total: 0, completed: 0, cancelled: 0, activeDrivers: 0, revenue: 0 },
  }));

export const adminToggleDriver = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; driverId: string; online: boolean }) => d)
  .handler(async () => ({ ok: true }));
