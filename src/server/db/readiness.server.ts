type RetryContext = {
  attempt: number;
  delayMs: number;
  error: unknown;
};

type UnavailableContext = {
  attempts: number;
  error: unknown;
};

type DatabaseReadinessOptions = {
  retryDelaysMs?: readonly number[];
  readyTtlMs?: number;
  now?: () => number;
  sleep?: (delayMs: number) => Promise<void>;
  onRetry?: (context: RetryContext) => void;
  onUnavailable?: (context: UnavailableContext) => void;
};

const transientCodes = new Set([
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "EPIPE",
  "ETIMEDOUT",
  "57P01",
  "57P02",
  "57P03",
]);

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code.toUpperCase() : undefined;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (!error || typeof error !== "object" || !("message" in error)) {
    return "";
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

export function isTransientDatabaseError(error: unknown): boolean {
  const pending = [error];
  const visited = new Set<unknown>();

  while (pending.length) {
    const current = pending.pop();

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    const code = errorCode(current);
    if (code && (transientCodes.has(code) || (code.startsWith("08") && code !== "08P01"))) {
      return true;
    }

    if (
      /connection (?:closed|ended|refused|reset|terminated)|connect timeout|database system is (?:shutting down|starting up)|getaddrinfo (?:eai_again|enotfound)|server closed the connection|socket (?:closed|hang up)/i.test(
        errorMessage(current),
      )
    ) {
      return true;
    }

    if (current && typeof current === "object") {
      const nested = current as { cause?: unknown; errors?: unknown[] };
      if (nested.cause) {
        pending.push(nested.cause);
      }
      if (Array.isArray(nested.errors)) {
        pending.push(...nested.errors);
      }
    }
  }

  return false;
}

export function createDatabaseReadinessGuard(
  probe: () => Promise<unknown>,
  options: DatabaseReadinessOptions = {},
) {
  const retryDelaysMs = options.retryDelaysMs ?? [250, 500, 1_000, 2_000];
  const readyTtlMs = options.readyTtlMs ?? 5_000;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((delayMs) => Bun.sleep(delayMs));
  let readyUntil = 0;
  let inFlight: Promise<boolean> | undefined;

  const runProbe = async () => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retryDelaysMs.length + 1; attempt += 1) {
      try {
        await probe();
        readyUntil = now() + readyTtlMs;
        return true;
      } catch (error) {
        if (!isTransientDatabaseError(error)) {
          throw error;
        }

        lastError = error;
        const delayMs = retryDelaysMs[attempt - 1];

        if (delayMs === undefined) {
          options.onUnavailable?.({ attempts: attempt, error });
          return false;
        }

        options.onRetry?.({ attempt, delayMs, error });
        await sleep(delayMs);
      }
    }

    options.onUnavailable?.({ attempts: retryDelaysMs.length + 1, error: lastError });
    return false;
  };

  return async function ensureDatabaseReady() {
    if (now() < readyUntil) {
      return true;
    }

    if (inFlight) {
      return inFlight;
    }

    inFlight = runProbe();

    try {
      return await inFlight;
    } finally {
      inFlight = undefined;
    }
  };
}
