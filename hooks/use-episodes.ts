import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';

import { Episode, fetchEpisodes } from '@/services/api';
import { useAuthToken } from '@/hooks/use-auth-token';

export function useEpisodes(podcastId: string | null) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getToken = useAuthToken();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!podcastId) {
      setEpisodes([]);
      return;
    }
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Not signed in');
        const data = await fetchEpisodes(token, podcastId);
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
  }, [podcastId, getToken, isLoaded, isSignedIn]);

  return { episodes, loading, error };
}
