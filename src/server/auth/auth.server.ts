import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "../db/client.server";
import * as schema from "../db/schema";

const railwayScopes = ["openid", "email", "profile", "offline_access", "workspace:viewer"];

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  user: {
    additionalFields: {
      railwayUserId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "railway",
          clientId: process.env.RAILWAY_OAUTH_CLIENT_ID ?? "",
          clientSecret: process.env.RAILWAY_OAUTH_CLIENT_SECRET ?? "",
          discoveryUrl: "https://backboard.railway.com/oauth/.well-known/openid-configuration",
          scopes: railwayScopes,
          prompt: "consent",
          pkce: true,
          authentication: "post",
          accessTokenExpiresIn: 3600,
          overrideUserInfo: true,
          mapProfileToUser: (profile) => ({
            name: String(profile.name ?? profile.email ?? "Railway user"),
            email: String(profile.email ?? `${profile.sub}@railway.local`),
            image: typeof profile.picture === "string" ? profile.picture : undefined,
            railwayUserId: String(profile.sub),
          }),
        },
      ],
    }),
    tanstackStartCookies(),
  ],
});

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function getSessionFromHeaders(headers: Headers) {
  return auth.api.getSession({
    headers,
  });
}

export { railwayScopes };
