import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "../server/rpc/router";

const url =
  typeof window === "undefined"
    ? `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/api/rpc`
    : `${window.location.origin}/api/rpc`;

const link = new RPCLink({
  url,
  fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
});

export const orpc: RouterClient<AppRouter> = createORPCClient(link);
