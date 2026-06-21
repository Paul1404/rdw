import { createAuthClient } from "better-auth/client";
import { genericOAuthClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
});

export const railwayScopes = ["openid", "email", "profile", "offline_access", "workspace:viewer"];
