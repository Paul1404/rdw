import { createFileRoute } from "@tanstack/react-router";
import { createServerOnlyFn } from "@tanstack/react-start";

const handleAuth = createServerOnlyFn(async (request: Request) => {
  const { auth } = await import("../../../server/auth/auth.server");
  return auth.handler(request);
});

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => handleAuth(request),
      POST: ({ request }: { request: Request }) => handleAuth(request),
    },
  },
  // TanStack Start accepts server handlers here, but the router option type does not expose them yet.
  // biome-ignore lint/suspicious/noExplicitAny: Server route type gap in current TanStack Start.
} as any);
