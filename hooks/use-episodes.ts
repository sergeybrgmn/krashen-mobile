import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useState } from 'react';

import { Episode, fetchDemoEpisodes, fetchEpisodes } from '@/services/api';
import { useAuthToken } from '@/hooks/use-auth-token';

export function useEpisodes(podcastId: string | null) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getToken = useAuthToken();
  const { isLoaded, isSignedIn } = useAuth();

  // Signed in → authed episodes; signed out → the public demo episodes.
  const load = useCallback(
    async (id: string): Promise<Episode[]> => {
      if (isSignedIn) {
        const token = await getToken();
        if (!token) throw new Error('Not signed in');
        return fetchEpisodes(token, id);
      }
      return fetchDemoEpisodes(id);
    },
    [getToken, isSignedIn],
  );

  const refetch = useCallback(async () => {
    if (!podcastId || !isLoaded) return;
    try {
      const data = await load(podcastId);
      setEpisodes(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [podcastId, load, isLoaded]);

  useEffect(() => {
    if (!podcastId) {
      setEpisodes([]);
      return;
    }
    if (!isLoaded) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await load(podcastId);
        if (!cancelled) setEpisodes(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [podcastId, load, isLoaded]);

  return { episodes, loading, error, refetch };
}
