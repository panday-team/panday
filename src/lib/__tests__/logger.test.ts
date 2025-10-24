import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger, logger } from "../logger";

describe("logger", () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleDebugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => undefined);
    consoleInfoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
  });

  describe("log levels", () => {
    it("logs debug messages", () => {
      process.env.LOG_LEVEL = "debug";
      logger.debug("test debug message");

      expect(consoleDebugSpy).toHaveBeenCalledOnce();
      const loggedMessage = JSON.parse(
        consoleDebugSpy.mock.calls[0]![0] as string,
      );
      expect(loggedMessage.level).toBe("DEBUG");
      expect(loggedMessage.message).toBe("test debug message");
      expect(loggedMessage.timestamp).toBeDefined();
    });

    it("logs info messages", () => {
      logger.info("test info message");

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const loggedMessage = JSON.parse(
        consoleInfoSpy.mock.calls[0]![0] as string,
      );
      expect(loggedMessage.level).toBe("INFO");
      expect(loggedMessage.message).toBe("test info message");
    });

    it("logs warn messages", () => {
      logger.warn("test warn message");

      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      const loggedMessage = JSON.parse(
        consoleWarnSpy.mock.calls[0]![0] as string,
      );
      expect(loggedMessage.level).toBe("WARN");
      expect(loggedMessage.message).toBe("test warn message");
    });

    it("logs error messages", () => {
      logger.error("test error message");

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedMessage = JSON.parse(
        consoleErrorSpy.mock.calls[0]![0] as string,
      );
      expect(loggedMessage.level).toBe("ERROR");
      expect(loggedMessage.message).toBe("test error message");
    });
  });

  describe("context", () => {
    it("includes context in log output", () => {
      logger.info("message with context", { userId: "123", action: "login" });

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const loggedMessage = JSON.parse(
        consoleInfoSpy.mock.calls[0]![0] as string,
      );
      expect(loggedMessage.context).toEqual({ userId: "123", action: "login" });
    });

    it("omits empty context", () => {
      logger.info("message without context", {});

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const loggedMessage = JSON.parse(
        consoleInfoSpy.mock.calls[0]![0] as string,
      );
      expect(loggedMessage.context).toBeUndefined();
    });

    it("merges default context with call context", () => {
      const customLogger = createLogger({ service: "test-service" });
      customLogger.info("test message", { requestId: "abc" });

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const loggedMessage = JSON.parse(
        consoleInfoSpy.mock.calls[0]![0] as string,
      );
      expect(loggedMessage.context).toEqual({
        service: "test-service",
        requestId: "abc",
      });
    });
  });

  describe("error handling", () => {
    it("includes Error objects in log output", () => {
      const testError = new Error("test error");
      logger.error("error occurred", testError);

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedMessage = JSON.parse(
        consoleErrorSpy.mock.calls[0]![0] as string,
      );
      expect(loggedMessage.error).toEqual({
        name: "Error",
        message: "test error",
        stack: testError.stack,
      });
    });

    it("includes non-Error objects in log output", () => {
      logger.error("error occurred", { code: 500, detail: "server error" });

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedMessage = JSON.parse(
        consoleErrorSpy.mock.calls[0]![0] as string,
      );
      expect(loggedMessage.error).toEqual({
        code: 500,
        detail: "server error",
      });
    });
  });

  describe("log level filtering", () => {
    it("respects LOG_LEVEL environment variable", () => {
      process.env.LOG_LEVEL = "error";

      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
    });

    it("filters out lower priority logs when LOG_LEVEL is warn", () => {
      process.env.LOG_LEVEL = "warn";

      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
    });

    it("allows all logs when LOG_LEVEL is debug", () => {
      process.env.LOG_LEVEL = "debug";

      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      expect(consoleDebugSpy).toHaveBeenCalledOnce();
      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
    });
  });
});
