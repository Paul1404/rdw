import { describe, expect, it, vi } from "vitest";
import {
  createDatabaseReadinessGuard,
  isTransientDatabaseError,
} from "../src/server/db/readiness.server";

function databaseError(code: string, message = "database unavailable") {
  return Object.assign(new Error(message), { code });
}

describe("database readiness", () => {
  it("recognizes connection failures through nested causes", () => {
    expect(isTransientDatabaseError(databaseError("ECONNRESET"))).toBe(true);
    expect(
      isTransientDatabaseError(new Error("outer failure", { cause: databaseError("57P03") })),
    ).toBe(true);
    expect(isTransientDatabaseError(databaseError("23505", "unique violation"))).toBe(false);
  });

  it("retries a sleeping database and succeeds", async () => {
    const probe = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(databaseError("ECONNREFUSED"))
      .mockResolvedValue(undefined);
    const sleep = vi.fn(async () => undefined);
    const onRetry = vi.fn();
    const ensureReady = createDatabaseReadinessGuard(probe, {
      retryDelaysMs: [250],
      readyTtlMs: 0,
      sleep,
      onRetry,
    });

    await expect(ensureReady()).resolves.toBe(true);
    expect(probe).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(250);
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1, delayMs: 250 }));
  });

  it("returns a controlled unavailable result after bounded retries", async () => {
    const error = databaseError("CONNECT_TIMEOUT");
    const probe = vi.fn<() => Promise<void>>().mockRejectedValue(error);
    const onUnavailable = vi.fn();
    const ensureReady = createDatabaseReadinessGuard(probe, {
      retryDelaysMs: [10, 20],
      sleep: async () => undefined,
      onUnavailable,
    });

    await expect(ensureReady()).resolves.toBe(false);
    expect(probe).toHaveBeenCalledTimes(3);
    expect(onUnavailable).toHaveBeenCalledWith({ attempts: 3, error });
  });

  it("does not hide non-connection database errors", async () => {
    const error = databaseError("23505", "unique violation");
    const probe = vi.fn<() => Promise<void>>().mockRejectedValue(error);
    const ensureReady = createDatabaseReadinessGuard(probe, {
      retryDelaysMs: [10],
      sleep: async () => undefined,
    });

    await expect(ensureReady()).rejects.toBe(error);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("shares one wake-up probe across concurrent requests", async () => {
    let resolveProbe: (() => void) | undefined;
    const probe = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveProbe = resolve;
        }),
    );
    const ensureReady = createDatabaseReadinessGuard(probe, { readyTtlMs: 1_000 });

    const first = ensureReady();
    const second = ensureReady();
    resolveProbe?.();

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(probe).toHaveBeenCalledTimes(1);
  });
});
