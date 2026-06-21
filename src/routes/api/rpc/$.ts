import { createFileRoute } from "@tanstack/react-router";
import { createServerOnlyFn } from "@tanstack/react-start";

const handleRpc = createServerOnlyFn(async (request: Request) => {
  const [{ RPCHandler }, { onError }, { router }] = await Promise.all([
    import("@orpc/server/fetch"),
    import("@orpc/server"),
    import("../../../server/rpc/router"),
  ]);
  const handler = new RPCHandler(router, {
    interceptors: [
      onError((error) => {
        console.error(error);
      }),
    ],
  });
  const { response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: {
      headers: request.headers,
    },
  });

  return response ?? new Response("Not Found", { status: 404 });
});

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      ANY: async ({ request }: { request: Request }) => {
        return handleRpc(request);
      },
    },
  },
  // TanStack Start accepts server handlers here, but the router option type does not expose them yet.
  // biome-ignore lint/suspicious/noExplicitAny: Server route type gap in current TanStack Start.
} as any);
