/**
 * Tests for API Error Handling Wrapper
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  withErrorHandling,
  parseJsonBody,
  parseSearchParams,
  notFound,
  badRequest,
  forbidden,
  created,
  noContent,
  type ApiContext,
} from "../api-handler";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock logger
vi.mock("../logger", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe("api-handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("withErrorHandling", () => {
    it("should execute handler successfully", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);

      const handler = vi.fn(async (_req: unknown, ctx: ApiContext) => {
        expect(ctx.userId).toBe("user_123");
        expect(ctx.logger).toBeDefined();
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withErrorHandling(handler);
      const request = new NextRequest("http://localhost:3000/api/test");

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(data).toEqual({ success: true });
      expect(response.status).toBe(200);
    });

    it("should return 401 when auth required but not authenticated", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const handler = vi.fn();
      const wrappedHandler = withErrorHandling(handler, { requireAuth: true });
      const request = new NextRequest("http://localhost:3000/api/test");

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(data).toMatchObject({
        error: "Unauthorized",
        message: "Authentication required",
      });
    });

    it("should allow unauthenticated requests when auth not required", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const handler = vi.fn(async (_req: unknown, ctx: ApiContext) => {
        expect(ctx.userId).toBe(null);
        return NextResponse.json({ public: true });
      });

      const wrappedHandler = withErrorHandling(handler, { requireAuth: false });
      const request = new NextRequest("http://localhost:3000/api/test");

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(data).toEqual({ public: true });
    });

    it("should handle Zod validation errors", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);

      const schema = z.object({ name: z.string() });
      const handler = vi.fn(async () => {
        schema.parse({ name: 123 }); // Will throw
        return NextResponse.json({});
      });

      const wrappedHandler = withErrorHandling(handler);
      const request = new NextRequest("http://localhost:3000/api/test");

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        error: "Validation error",
        message: "Invalid request data",
        code: "VALIDATION_ERROR",
      });
      expect(data.details).toBeDefined();
    });

    it("should handle Prisma unique constraint errors", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);

      const handler = vi.fn(async () => {
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint", {
          code: "P2002",
          clientVersion: "5.0.0",
        });
      });

      const wrappedHandler = withErrorHandling(handler);
      const request = new NextRequest("http://localhost:3000/api/test");

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data).toMatchObject({
        error: "Conflict",
        message: "Resource already exists",
        code: "DUPLICATE_RECORD",
      });
    });

    it("should handle Prisma record not found errors", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);

      const handler = vi.fn(async () => {
        throw new Prisma.PrismaClientKnownRequestError("Not found", {
          code: "P2025",
          clientVersion: "5.0.0",
        });
      });

      const wrappedHandler = withErrorHandling(handler);
      const request = new NextRequest("http://localhost:3000/api/test");

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toMatchObject({
        error: "Not found",
        message: "Resource not found",
        code: "NOT_FOUND",
      });
    });

    it("should handle generic Prisma errors", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);

      const handler = vi.fn(async () => {
        throw new Prisma.PrismaClientKnownRequestError("Database error", {
          code: "P2003",
          clientVersion: "5.0.0",
        });
      });

      const wrappedHandler = withErrorHandling(handler, {
        errorPrefix: "Test operation failed",
      });
      const request = new NextRequest("http://localhost:3000/api/test");

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        error: "Database error",
        message: "Test operation failed",
        code: "P2003",
      });
    });

    it("should handle generic errors", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);

      const handler = vi.fn(async () => {
        throw new Error("Something went wrong");
      });

      const wrappedHandler = withErrorHandling(handler, {
        errorPrefix: "Custom error prefix",
      });
      const request = new NextRequest("http://localhost:3000/api/test");

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        error: "Internal server error",
        message: "Custom error prefix",
        code: "INTERNAL_ERROR",
      });
    });

    it("should use custom logger context", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);
      const { createLogger } = await import("../logger");

      const handler = vi.fn(async () => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withErrorHandling(handler, {
        loggerContext: "custom-api",
      });
      const request = new NextRequest("http://localhost:3000/api/test");

      await wrappedHandler(request);

      expect(createLogger).toHaveBeenCalledWith({ context: "custom-api" });
    });
  });

  describe("parseJsonBody", () => {
    it("should parse and validate JSON body", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({ name: "Alice", age: 30 }),
      });

      const result = await parseJsonBody(request, schema);

      expect(result).toEqual({ name: "Alice", age: 30 });
    });

    it("should throw on invalid data", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({ name: "Alice", age: "thirty" }),
      });

      await expect(parseJsonBody(request, schema)).rejects.toThrow();
    });
  });

  describe("parseSearchParams", () => {
    it("should parse and validate URL search params", () => {
      const schema = z.object({
        page: z.string(),
        limit: z.string().optional(),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/test?page=2&limit=10",
      );

      const result = parseSearchParams(request, schema);

      expect(result).toEqual({ page: "2", limit: "10" });
    });

    it("should throw on invalid params", () => {
      const schema = z.object({
        page: z.string(),
      });

      const request = new NextRequest("http://localhost:3000/api/test");

      expect(() => parseSearchParams(request, schema)).toThrow();
    });
  });

  describe("helper response functions", () => {
    it("notFound should return 404", async () => {
      const response = notFound("User not found");
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toMatchObject({
        error: "Not found",
        message: "User not found",
        code: "NOT_FOUND",
      });
    });

    it("badRequest should return 400", async () => {
      const response = badRequest("Invalid email", { field: "email" });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        error: "Bad request",
        message: "Invalid email",
        details: { field: "email" },
        code: "BAD_REQUEST",
      });
    });

    it("forbidden should return 403", async () => {
      const response = forbidden("Not your resource");
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toMatchObject({
        error: "Forbidden",
        message: "Not your resource",
        code: "FORBIDDEN",
      });
    });

    it("created should return 201", async () => {
      const response = created({ id: "123", name: "Test" });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({ id: "123", name: "Test" });
    });

    it("noContent should return 204", () => {
      const response = noContent();

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });
  });
});
