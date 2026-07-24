import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchDemoPodcasts, fetchPodcasts, Podcast } from '@/services/api';
import { useAuthToken } from '@/hooks/use-auth-token';

export function usePodcasts() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const getToken = useAuthToken();
  const { isLoaded, isSignedIn } = useAuth();

  // Signed in → authed catalog; signed out → the public demo catalog.
  const load = useCallback(async (): Promise<Podcast[]> => {
    if (isSignedIn) {
      const token = await getToken();
      if (!token) throw new Error('Not signed in');
      return fetchPodcasts(token);
    }
    return fetchDemoPodcasts();
  }, [getToken, isSignedIn]);

  const refetch = useCallback(async () => {
    if (!isLoaded) return;
    try {
      const data = await load();
      setPodcasts(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [load, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await load();
        if (!cancelled) setPodcasts(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, isLoaded]);

  const languages = useMemo(() => {
    const codes = new Set(podcasts.map((p) => p.language.toLowerCase()));
    return Array.from(codes).sort();
  }, [podcasts]);

  return { podcasts, loading, error, languages, refetch };
}
