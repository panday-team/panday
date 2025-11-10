import { env } from "@/env";
import { logger } from "@/lib/logger";

export function requireCronAuth(request: Request): Response | null {
  if (!env.CRON_SECRET) {
    logger.warn("CRON_SECRET is not configured; denying cron request");
    return new Response("Cron secret not configured", { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    logger.warn("Unauthorized cron request rejected");
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}
