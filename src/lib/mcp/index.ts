import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyRides from "./tools/list-my-rides";
import getMototaxistaStatus from "./tools/get-mototaxista-status";

// Use direct Supabase host as OAuth issuer (published SUPABASE_URL is proxied).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "motozap-mcp",
  title: "InterGO",
  version: "0.1.0",
  instructions:
    "Read-only InterGO tools scoped to the signed-in user. Use `get_my_profile` for identity, `list_my_rides` for recent rides (as passenger or mototaxista), and `get_mototaxista_status` for the current mototaxista's plan and commission cycle.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyRides, getMototaxistaStatus],
});
