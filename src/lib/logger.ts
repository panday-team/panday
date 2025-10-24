type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: unknown, context?: LogContext) => void;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const getCurrentLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
};

const shouldLog = (level: LogLevel): boolean => {
  const currentLevel = getCurrentLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel];
};

const formatLog = (
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown,
): string => {
  const timestamp = new Date().toISOString();
  const logObject: Record<string, unknown> = {
    timestamp,
    level: level.toUpperCase(),
    message,
  };

  if (context && Object.keys(context).length > 0) {
    logObject.context = context;
  }

  if (error) {
    if (error instanceof Error) {
      logObject.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else {
      logObject.error = error;
    }
  }

  return JSON.stringify(logObject);
};

const createLogger = (defaultContext?: LogContext): Logger => {
  const mergeContext = (context?: LogContext): LogContext => {
    return { ...defaultContext, ...context };
  };

  return {
    debug: (message: string, context?: LogContext) => {
      if (shouldLog("debug")) {
        console.debug(formatLog("debug", message, mergeContext(context)));
      }
    },
    info: (message: string, context?: LogContext) => {
      if (shouldLog("info")) {
        console.info(formatLog("info", message, mergeContext(context)));
      }
    },
    warn: (message: string, context?: LogContext) => {
      if (shouldLog("warn")) {
        console.warn(formatLog("warn", message, mergeContext(context)));
      }
    },
    error: (message: string, error?: unknown, context?: LogContext) => {
      if (shouldLog("error")) {
        console.error(
          formatLog("error", message, mergeContext(context), error),
        );
      }
    },
  };
};

export const logger = createLogger();

export { createLogger };
export type { Logger, LogContext };
