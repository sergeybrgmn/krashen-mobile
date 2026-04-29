import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useState } from 'react';

import {
  ApiError,
  EpisodeData,
  Segment,
  WordExplanation,
  fetchEpisodeData,
} from '@/services/api';
import { useAuthToken } from '@/hooks/use-auth-token';

export function useEpisodeData(episodeId: string | null, targetLanguage: string | null) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [explanations, setExplanations] = useState<
    Record<string, { words: WordExplanation[] }>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proRequired, setProRequired] = useState(false);
  // Bumping this re-triggers the fetch effect; used to retry after a paywall purchase.
  const [retryNonce, setRetryNonce] = useState(0);
  const getToken = useAuthToken();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!episodeId) {
      setSegments([]);
      setExplanations({});
      setProRequired(false);
      return;
    }
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setProRequired(false);

    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Not signed in');
        // No target language → backend returns segments only (null explanations);
        // the raw transcript still has value during playback.
        const data = await fetchEpisodeData(token, episodeId, targetLanguage ?? '');
        if (cancelled) return;
        setSegments(data.segments ?? []);
        setExplanations(data.explanations ?? {});
      } catch (e) {
        if (cancelled) return;
        const apiErr = e as ApiError;
        if (apiErr.status === 403 && apiErr.detail?.code === 'pro_required') {
          setProRequired(true);
        } else {
          setError(apiErr.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [episodeId, targetLanguage, getToken, retryNonce, isLoaded, isSignedIn]);

  const refetch = useCallback(() => setRetryNonce((n) => n + 1), []);

  return { segments, explanations, loading, error, proRequired, refetch };
}
