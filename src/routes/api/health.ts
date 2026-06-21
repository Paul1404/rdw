import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () => Response.json({ status: "ok" }),
    },
  },
  // TanStack Start accepts server handlers here, but the router option type does not expose them yet.
  // biome-ignore lint/suspicious/noExplicitAny: Server route type gap in current TanStack Start.
} as any);
