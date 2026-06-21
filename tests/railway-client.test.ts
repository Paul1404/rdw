import { afterEach, describe, expect, it, vi } from "vitest";
import { railwayGraphql } from "../src/server/railway/client.server";

const originalFetch = globalThis.fetch;

describe("railwayGraphql", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("maps GraphQL errors to ORPCError", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ errors: [{ message: "bad query" }] }), { status: 200 }),
    ) as unknown as typeof fetch;

    await expect(railwayGraphql("token", "query")).rejects.toThrow("bad query");
  });
});
