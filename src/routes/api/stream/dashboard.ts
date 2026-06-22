import { createFileRoute } from "@tanstack/react-router";
import { createServerOnlyFn } from "@tanstack/react-start";

const streamDashboard = createServerOnlyFn(async (request: Request) => {
  const [{ getSessionFromHeaders }, { getDashboard }, { errorFields, logger }] = await Promise.all([
    import("../../../server/auth/auth.server"),
    import("../../../server/railway/queries.server"),
    import("../../../server/logger.server"),
  ]);
  const session = await getSessionFromHeaders(request.headers);

  if (!session?.user) {
    return Response.json(
      { code: "UNAUTHORIZED", message: "Sign in before using RDW" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const workspaceIds = url.searchParams.getAll("workspaceId").filter(Boolean);
  const encoder = new TextEncoder();
  let lastPayload = "";
  let closed = false;
  let inFlight = false;
  let interval: ReturnType<typeof setInterval> | undefined;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const close = () => {
        if (closed) {
          return;
        }

        closed = true;
        if (interval) {
          clearInterval(interval);
        }
        controller.close();
      };

      request.signal.addEventListener("abort", close, { once: true });

      const pushDashboard = async () => {
        if (closed || inFlight) {
          return;
        }

        inFlight = true;

        try {
          const dashboard = await getDashboard(session.user.id, {
            workspaceIds: workspaceIds.length ? workspaceIds : undefined,
          });
          const payload = JSON.stringify({
            projects: dashboard.projects,
            summary: dashboard.summary,
            workspaces: dashboard.workspaces,
          });

          if (payload !== lastPayload) {
            lastPayload = payload;
            send("dashboard", dashboard);
          } else {
            send("heartbeat", { at: new Date().toISOString() });
          }
        } catch (error) {
          logger.warn("dashboard.stream.error", errorFields(error));
          send("error", {
            message: "Railway dashboard stream failed",
          });
        } finally {
          inFlight = false;
        }
      };

      await pushDashboard();
      interval = setInterval(pushDashboard, 3_000);
    },
    cancel() {
      closed = true;
      if (interval) {
        clearInterval(interval);
      }
    },
  });

  return new Response(body, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
});

export const Route = createFileRoute("/api/stream/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => streamDashboard(request),
    },
  },
  // TanStack Start accepts server handlers here, but the router option type does not expose them yet.
  // biome-ignore lint/suspicious/noExplicitAny: Server route type gap in current TanStack Start.
} as any);
