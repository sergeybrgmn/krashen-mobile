import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Me, fetchMe } from '@/services/api';

export function useMe(enabled: boolean = true) {
  const { getToken, isSignedIn } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const jwtTemplate = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
      const token = await getToken(jwtTemplate ? { template: jwtTemplate } : undefined);
      if (!token) throw new Error('No auth token');
      const data = await fetchMe(token);
      setMe(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn]);

  // Hold the latest refetch in a ref so the auto-fetch effect below
  // does not re-fire when Clerk rotates getToken/isSignedIn references.
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Fire only on intentional `enabled` transitions (e.g. drawer opening),
  // never on Clerk session-refresh churn.
  useEffect(() => {
    if (enabled) {
      void refetchRef.current();
    }
  }, [enabled]);

  return { me, loading, error, refetch };
}
