import { ORPCError } from "@orpc/server";
import { logger } from "../logger.server";

export const RAILWAY_GRAPHQL_URL = "https://backboard.railway.com/graphql/v2";

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
};

export async function railwayGraphql<T>(
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const operationName = query.match(/\b(?:query|mutation)\s+(\w+)/)?.[1] ?? "anonymous";
  const response = await fetch(RAILWAY_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    logger.error("railway.api.http_error", {
      operationName,
      status: response.status,
      responseBody: responseBody.slice(0, 2_000),
      variables,
    });
    throw new ORPCError("RAILWAY_API_FAILED", {
      message: `Railway API returned HTTP ${response.status}: ${responseBody.slice(0, 300)}`,
    });
  }

  const payload = (await response.json()) as GraphqlResponse<T>;

  if (payload.errors?.length) {
    logger.error("railway.api.graphql_error", {
      operationName,
      errors: payload.errors,
      variables,
    });
    throw new ORPCError("RAILWAY_API_FAILED", {
      message: payload.errors.map((error) => error.message).join("; "),
    });
  }

  if (!payload.data) {
    throw new ORPCError("RAILWAY_API_FAILED", {
      message: "Railway API returned no data",
    });
  }

  return payload.data;
}

export async function refreshRailwayToken(refreshToken: string) {
  const response = await fetch("https://backboard.railway.com/oauth/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.RAILWAY_OAUTH_CLIENT_ID ?? "",
      client_secret: process.env.RAILWAY_OAUTH_CLIENT_SECRET ?? "",
    }),
  });

  if (!response.ok) {
    throw new ORPCError("RAILWAY_REAUTH_REQUIRED", {
      message: "Railway token refresh failed",
    });
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
}
