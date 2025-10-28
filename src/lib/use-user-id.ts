"use client";

import { useEffect } from "react";
import { generateUserId, getCookieName } from "@/lib/user-identifier";

export function useUserId(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const cookieName = getCookieName();
    const existingCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${cookieName}=`));

    if (!existingCookie) {
      const userId = generateUserId();
      const maxAge = 365 * 24 * 60 * 60;
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + maxAge);

      document.cookie = `${cookieName}=${userId}; expires=${expiryDate.toUTCString()}; path=/`;
    }
  }, []);
}
