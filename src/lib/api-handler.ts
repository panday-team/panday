/**
 * API Error Handling Wrapper
 *
 * Provides standardized error handling, logging, and response formatting
 * for Next.js API routes. Eliminates repetitive try/catch blocks.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { createLogger } from "@/lib/logger";

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  code?: string;
}

/**
 * API handler context - available to all handlers
 */
export interface ApiContext {
  userId: string | null;
  logger: ReturnType<typeof createLogger>;
}

/**
 * API handler function signature (no route context)
 */
export type ApiHandlerNoContext<TRequest = unknown, TResponse = unknown> = (
  request: TRequest,
  context: ApiContext,
) => Promise<NextResponse<TResponse | ApiErrorResponse>>;

/**
 * API handler function signature (with route context)
 */
export type ApiHandlerWithContext<
  TRequest = unknown,
  TResponse = unknown,
  TContext = unknown,
> = (
  request: TRequest,
  context: ApiContext,
  routeContext: TContext,
) => Promise<NextResponse<TResponse | ApiErrorResponse>>;

/**
 * Handler options
 */
export interface HandlerOptions {
  /** Require authentication (401 if not authenticated) */
  requireAuth?: boolean;
  /** Custom logger context */
  loggerContext?: string;
  /** Custom error message prefix */
  errorPrefix?: string;
}

/**
 * Wraps an API handler with standardized error handling, auth, and logging
 *
 * @example
 * // Without route context
 * export const GET = withErrorHandling(async (request, { userId, logger }) => {
 *   const data = await fetchData(userId);
 *   return NextResponse.json(data);
 * }, { requireAuth: true, loggerContext: 'profile-api' });
 *
 * // With route context (dynamic routes)
 * export const GET = withErrorHandling(async (request, { userId }, context) => {
 *   const { id } = await context.params;
 *   return NextResponse.json({ id });
 * }, { requireAuth: true });
 */
export function withErrorHandling<TRequest = unknown, TResponse = unknown>(
  handler: ApiHandlerNoContext<TRequest, TResponse>,
  options?: HandlerOptions,
): (request: TRequest) => Promise<NextResponse<TResponse | ApiErrorResponse>>;

export function withErrorHandling<
  TRequest = unknown,
  TResponse = unknown,
  TContext = unknown,
>(
  handler: ApiHandlerWithContext<TRequest, TResponse, TContext>,
  options?: HandlerOptions,
): (
  request: TRequest,
  routeContext: TContext,
) => Promise<NextResponse<TResponse | ApiErrorResponse>>;

export function withErrorHandling<
  TRequest = unknown,
  TResponse = unknown,
  TContext = unknown,
>(
  handler:
    | ApiHandlerNoContext<TRequest, TResponse>
    | ApiHandlerWithContext<TRequest, TResponse, TContext>,
  options: HandlerOptions = {},
): (
  request: TRequest,
  routeContext?: TContext,
) => Promise<NextResponse<TResponse | ApiErrorResponse>> {
  const {
    requireAuth = false,
    loggerContext = "api",
    errorPrefix = "Request failed",
  } = options;

  const logger = createLogger({ context: loggerContext });

  return async (request: TRequest, routeContext?: TContext) => {
    try {
      // Authentication check
      const { userId } = await auth();

      if (requireAuth && !userId) {
        logger.warn("Unauthorized access attempt");
        return NextResponse.json<ApiErrorResponse>(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 },
        );
      }

      // Create context
      const context: ApiContext = {
        userId: userId ?? null,
        logger,
      };

      // Execute handler
      // Check handler arity to determine if it expects routeContext
      if (handler.length === 3 && routeContext !== undefined) {
        return await (
          handler as ApiHandlerWithContext<TRequest, TResponse, TContext>
        )(request, context, routeContext);
      } else {
        return await (handler as ApiHandlerNoContext<TRequest, TResponse>)(
          request,
          context,
        );
      }
    } catch (error) {
      // Zod validation errors
      if (error instanceof z.ZodError) {
        logger.warn("Validation error", { errors: error.errors });
        return NextResponse.json<ApiErrorResponse>(
          {
            error: "Validation error",
            message: "Invalid request data",
            details: error.errors,
            code: "VALIDATION_ERROR",
          },
          { status: 400 },
        );
      }

      // Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error("Database error", error, { code: error.code });

        // Unique constraint violation
        if (error.code === "P2002") {
          return NextResponse.json<ApiErrorResponse>(
            {
              error: "Conflict",
              message: "Resource already exists",
              code: "DUPLICATE_RECORD",
            },
            { status: 409 },
          );
        }

        // Record not found
        if (error.code === "P2025") {
          return NextResponse.json<ApiErrorResponse>(
            {
              error: "Not found",
              message: "Resource not found",
              code: "NOT_FOUND",
            },
            { status: 404 },
          );
        }

        // Generic database error
        return NextResponse.json<ApiErrorResponse>(
          {
            error: "Database error",
            message: errorPrefix,
            code: error.code,
          },
          { status: 500 },
        );
      }

      // Generic errors
      const err = error as Error;
      logger.error(errorPrefix, err);

      return NextResponse.json<ApiErrorResponse>(
        {
          error: "Internal server error",
          message: errorPrefix,
          code: "INTERNAL_ERROR",
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Parse and validate request JSON body with Zod schema
 *
 * @example
 * const body = await parseJsonBody(request, CreateProfileSchema);
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const body = (await request.json()) as unknown;
  return schema.parse(body);
}

/**
 * Parse and validate URL search params with Zod schema
 *
 * @example
 * const params = parseSearchParams(request, ListQuerySchema);
 */
export function parseSearchParams<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): T {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  return schema.parse(params);
}

/**
 * Create a 404 Not Found response
 */
export function notFound(message = "Resource not found"): NextResponse {
  return NextResponse.json<ApiErrorResponse>(
    { error: "Not found", message, code: "NOT_FOUND" },
    { status: 404 },
  );
}

/**
 * Create a 400 Bad Request response
 */
export function badRequest(
  message = "Invalid request",
  details?: unknown,
): NextResponse {
  return NextResponse.json<ApiErrorResponse>(
    { error: "Bad request", message, details, code: "BAD_REQUEST" },
    { status: 400 },
  );
}

/**
 * Create a 403 Forbidden response
 */
export function forbidden(message = "Access denied"): NextResponse {
  return NextResponse.json<ApiErrorResponse>(
    { error: "Forbidden", message, code: "FORBIDDEN" },
    { status: 403 },
  );
}

/**
 * Create a 201 Created response
 */
export function created<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 });
}

/**
 * Create a 204 No Content response
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
