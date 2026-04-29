import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useMemo, useState } from 'react';

import { fetchPodcasts, Podcast } from '@/services/api';
import { useAuthToken } from '@/hooks/use-auth-token';

export function usePodcasts() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const getToken = useAuthToken();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Not signed in');
        const data = await fetchPodcasts(token);
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
  }, [getToken, isLoaded, isSignedIn]);

  const languages = useMemo(() => {
    const codes = new Set(podcasts.map((p) => p.language.toLowerCase()));
    return Array.from(codes).sort();
  }, [podcasts]);

  return { podcasts, loading, error, languages };
}
