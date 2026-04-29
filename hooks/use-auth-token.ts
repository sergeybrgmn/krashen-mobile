import { useAuth } from '@clerk/clerk-expo';
import { useCallback } from 'react';

/** Wraps Clerk's getToken with the optional JWT template env var.
 * Returns null when not signed in. */
export function useAuthToken() {
  const { getToken, isSignedIn } = useAuth();
  return useCallback(async (): Promise<string | null> => {
    if (!isSignedIn) return null;
    const jwtTemplate = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
    return (await getToken(jwtTemplate ? { template: jwtTemplate } : undefined)) ?? null;
  }, [getToken, isSignedIn]);
}
