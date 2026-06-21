type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = (
  process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug")
)
  .toLowerCase()
  .trim() as LogLevel;

const minimumLevel = levelRank[configuredLevel] ? configuredLevel : "info";
const sensitiveKeyPattern = /authorization|cookie|secret|token|password|key|database_url/i;

function shouldLog(level: LogLevel) {
  return levelRank[level] >= levelRank[minimumLevel];
}

function sanitize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "production" ? undefined : value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as LogFields).map(([key, entry]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[redacted]" : sanitize(entry),
    ]),
  );
}

export function log(level: LogLevel, event: string, fields: LogFields = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const sanitizedFields = sanitize(fields) as LogFields;
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: "rdw",
    ...sanitizedFields,
  };

  const line = JSON.stringify(record);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export const logger = {
  debug: (event: string, fields?: LogFields) => log("debug", event, fields),
  info: (event: string, fields?: LogFields) => log("info", event, fields),
  warn: (event: string, fields?: LogFields) => log("warn", event, fields),
  error: (event: string, fields?: LogFields) => log("error", event, fields),
};

export function errorFields(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }

  return { error };
}
