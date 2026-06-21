import { ORPCError } from "@orpc/server";

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
  const response = await fetch(RAILWAY_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new ORPCError("RAILWAY_API_FAILED", {
      message: `Railway API returned HTTP ${response.status}`,
    });
  }

  const payload = (await response.json()) as GraphqlResponse<T>;

  if (payload.errors?.length) {
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
