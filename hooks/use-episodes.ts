import { useEffect, useState } from 'react';

import { Episode, fetchEpisodes } from '@/services/api';

export function useEpisodes(podcastId: string | null) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!podcastId) {
      setEpisodes([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchEpisodes(podcastId)
      .then((data) => {
        if (!cancelled) setEpisodes(data);
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
  }, [podcastId]);

  return { episodes, loading, error };
}
