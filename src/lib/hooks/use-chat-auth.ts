/**
 * useChatAuth Hook
 * Handles authentication state and user identification for chat functionality
 */

import { useAuth } from "@clerk/nextjs";

export interface UseChatAuthReturn {
  /** User ID from Clerk authentication (null if not authenticated) */
  userId: string | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the user is in guest mode (not authenticated) */
  isGuest: boolean;
  /** Whether authentication state is being loaded */
  isLoading: boolean;
}

export function useChatAuth(): UseChatAuthReturn {
  const { userId, isLoaded } = useAuth();

  return {
    userId: userId ?? null,
    isAuthenticated: !!userId,
    isGuest: !userId,
    isLoading: !isLoaded,
  };
}
