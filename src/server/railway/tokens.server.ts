import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.server";
import { accounts, railwayTokens } from "../db/schema";
import { decryptToken, encryptToken } from "../security/tokens.server";
import { refreshRailwayToken } from "./client.server";

const refreshWindowMs = 5 * 60 * 1000;

function expiresAtFromSeconds(seconds = 3600) {
  return new Date(Date.now() + seconds * 1000);
}

async function syncBetterAuthAccountToken(userId: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "railway")))
    .limit(1);

  if (!account?.accessToken) {
    return null;
  }

  const now = new Date();
  const expiresAt = account.accessTokenExpiresAt ?? expiresAtFromSeconds();

  const encrypted = {
    id: crypto.randomUUID(),
    userId,
    providerAccountId: account.id,
    accessTokenEncrypted: encryptToken(account.accessToken),
    refreshTokenEncrypted: account.refreshToken ? encryptToken(account.refreshToken) : null,
    accessTokenExpiresAt: expiresAt,
    scope: account.scope ?? "openid email profile offline_access workspace:viewer",
    createdAt: now,
    updatedAt: now,
  };

  await db
    .insert(railwayTokens)
    .values(encrypted)
    .onConflictDoUpdate({
      target: railwayTokens.userId,
      set: {
        providerAccountId: encrypted.providerAccountId,
        accessTokenEncrypted: encrypted.accessTokenEncrypted,
        refreshTokenEncrypted: encrypted.refreshTokenEncrypted,
        accessTokenExpiresAt: encrypted.accessTokenExpiresAt,
        scope: encrypted.scope,
        updatedAt: now,
      },
    });

  await db
    .update(accounts)
    .set({
      accessToken: null,
      refreshToken: null,
      updatedAt: now,
    })
    .where(eq(accounts.id, account.id));

  return encrypted;
}

export async function getStoredRailwayToken(userId: string) {
  const [stored] = await db
    .select()
    .from(railwayTokens)
    .where(eq(railwayTokens.userId, userId))
    .limit(1);

  return stored ?? syncBetterAuthAccountToken(userId);
}

export async function getValidRailwayAccessToken(userId: string) {
  const stored = await getStoredRailwayToken(userId);

  if (!stored) {
    throw new ORPCError("RAILWAY_REAUTH_REQUIRED", {
      message: "Connect Railway before viewing deployments",
    });
  }

  const expiresSoon = stored.accessTokenExpiresAt.getTime() - Date.now() < refreshWindowMs;

  if (!expiresSoon) {
    return decryptToken(stored.accessTokenEncrypted);
  }

  if (!stored.refreshTokenEncrypted) {
    throw new ORPCError("RAILWAY_REAUTH_REQUIRED", {
      message: "Railway refresh token is missing",
    });
  }

  const refreshToken = decryptToken(stored.refreshTokenEncrypted);
  const refreshed = await refreshRailwayToken(refreshToken);
  const now = new Date();

  await db
    .update(railwayTokens)
    .set({
      accessTokenEncrypted: encryptToken(refreshed.access_token),
      refreshTokenEncrypted: refreshed.refresh_token
        ? encryptToken(refreshed.refresh_token)
        : stored.refreshTokenEncrypted,
      accessTokenExpiresAt: expiresAtFromSeconds(refreshed.expires_in),
      scope: refreshed.scope ?? stored.scope,
      updatedAt: now,
    })
    .where(eq(railwayTokens.id, stored.id));

  return refreshed.access_token;
}
