"use client";

import { useUserId } from "@/lib/use-user-id";

export function UserIdInitializer(): null {
  useUserId();
  return null;
}
