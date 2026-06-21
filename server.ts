import { join, normalize } from "node:path";
import { errorFields, logger } from "./src/server/logger.server";

type StartServer = {
  default: {
    fetch: (request: Request, server: Bun.Server) => Response | Promise<Response>;
  };
};

const startServer = (await import("./dist/server/server.js")) as StartServer;
const clientRoot = join(import.meta.dir, "dist/client");
const port = Number(process.env.PORT ?? 3000);

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const staticFiles = new Set([
  "/apple-touch-icon.png",
  "/favicon-16.png",
  "/favicon-32.png",
  "/favicon.ico",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
]);

function shouldServeStatic(pathname: string) {
  return (
    pathname.startsWith("/assets/") || pathname.startsWith("/brand/") || staticFiles.has(pathname)
  );
}

function getStaticPath(pathname: string) {
  let decodedPathname: string;

  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = normalize(decodedPathname).replace(/^\/+/, "");

  if (!relativePath || relativePath.startsWith("..") || relativePath.includes("\0")) {
    return null;
  }

  return join(clientRoot, relativePath);
}

async function serveStatic(request: Request) {
  const url = new URL(request.url);

  if (!shouldServeStatic(url.pathname)) {
    return null;
  }

  const filePath = getStaticPath(url.pathname);

  if (!filePath) {
    return new Response("Bad request", { status: 400 });
  }

  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    return new Response("Not found", { status: 404 });
  }

  const extension = filePath.match(/\.[^.]+$/)?.[0] ?? "";
  const isImmutableAsset = url.pathname.startsWith("/assets/");
  const headers = new Headers({
    "Cache-Control": isImmutableAsset
      ? "public, max-age=31536000, immutable"
      : "public, max-age=86400",
    "Content-Type": contentTypes[extension] ?? "application/octet-stream",
  });

  return new Response(request.method === "HEAD" ? null : file, { headers });
}

Bun.serve({
  port,
  async fetch(request, server) {
    const startedAt = performance.now();
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();

    try {
      const staticResponse = await serveStatic(request);

      if (staticResponse) {
        logger.info("http.request", {
          requestId,
          method: request.method,
          path: url.pathname,
          status: staticResponse.status,
          durationMs: Math.round(performance.now() - startedAt),
          static: true,
        });
        return staticResponse;
      }

      const response = await startServer.default.fetch(request, server);
      logger.info("http.request", {
        requestId,
        method: request.method,
        path: url.pathname,
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
        static: false,
      });
      return response;
    } catch (error) {
      logger.error("http.error", {
        requestId,
        method: request.method,
        path: url.pathname,
        durationMs: Math.round(performance.now() - startedAt),
        ...errorFields(error),
      });
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

logger.info("server.started", { port });
