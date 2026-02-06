import { useEffect, useState } from 'react';

import {
  EpisodeData,
  Segment,
  WordExplanation,
  fetchEpisodeData,
} from '@/services/api';

export function useEpisodeData(episodeId: string | null, targetLanguage: string | null) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [explanations, setExplanations] = useState<
    Record<string, { words: WordExplanation[] }>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!episodeId || !targetLanguage) {
      setSegments([]);
      setExplanations({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchEpisodeData(episodeId, targetLanguage)
      .then((data: EpisodeData) => {
        if (cancelled) return;
        setSegments(data.segments);
        setExplanations(data.explanations);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [episodeId, targetLanguage]);

  return { segments, explanations, loading, error };
}
