import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useRef } from 'react';

/** Wraps Clerk's getToken with the optional JWT template env var.
 * Returns null when not signed in.
 *
 * Returns a stable callback identity across renders. Clerk's getToken/isSignedIn
 * references change on every session refresh, so we route through a ref to keep
 * consumer useEffect deps from thrashing. */
export function useAuthToken() {
  const { getToken, isSignedIn } = useAuth();
  const ref = useRef({ getToken, isSignedIn });
  ref.current = { getToken, isSignedIn };

  return useCallback(async (): Promise<string | null> => {
    if (!ref.current.isSignedIn) return null;
    const jwtTemplate = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
    return (await ref.current.getToken(jwtTemplate ? { template: jwtTemplate } : undefined)) ?? null;
  }, []);
}
