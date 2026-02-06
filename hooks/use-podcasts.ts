import { useEffect, useMemo, useState } from 'react';

import { fetchPodcasts, Podcast } from '@/services/api';

export function usePodcasts() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPodcasts()
      .then((data) => {
        if (!cancelled) setPodcasts(data);
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
  }, []);

  const languages = useMemo(() => {
    const codes = new Set(podcasts.map((p) => p.language.toLowerCase()));
    return Array.from(codes).sort();
  }, [podcasts]);

  return { podcasts, loading, error, languages };
}
