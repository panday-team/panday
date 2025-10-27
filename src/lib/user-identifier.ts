const USER_ID_COOKIE_NAME = "panday_user_id";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export async function generateUserIdAsync(): Promise<string> {
  if (typeof window !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const nodeCrypto = await import("crypto");
  return nodeCrypto.randomUUID();
}

export function generateUserId(): string {
  if (typeof window !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  throw new Error(
    "generateUserId() must be called in browser context. Use generateUserIdAsync() for server context.",
  );
}

export function getUserIdCookieHeader(userId: string): string {
  return `${USER_ID_COOKIE_NAME}=${userId}; Max-Age=${COOKIE_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax`;
}

export function getCookieName(): string {
  return USER_ID_COOKIE_NAME;
}
