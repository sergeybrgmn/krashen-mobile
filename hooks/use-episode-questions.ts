import { useEffect, useState } from 'react';

import { EpisodeQuestion, fetchEpisodeQuestions } from '@/services/api';
import { useAuthToken } from '@/hooks/use-auth-token';

/** Fetches the user's Q&A history for an episode. Re-fetches every time
 * `enabled` flips to true (i.e. each time the history modal opens), so a
 * just-asked question shows up without extra wiring. Keeps stale data while
 * closed to avoid a loading flash on reopen. */
export function useEpisodeQuestions(episodeId: string | null, enabled: boolean) {
  const [questions, setQuestions] = useState<EpisodeQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getToken = useAuthToken();

  useEffect(() => {
    if (!enabled || !episodeId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Not signed in');
        const data = await fetchEpisodeQuestions(token, episodeId);
        if (!cancelled) setQuestions(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, episodeId, getToken]);

  return { questions, loading, error };
}
