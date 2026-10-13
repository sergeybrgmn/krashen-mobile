import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuthToken } from '@/hooks/use-auth-token';
import { Episode } from '@/services/api';
import {
  SavedProgress,
  loadPodcastProgress,
  subscribeLocalProgress,
} from '@/services/playback-progress';

/** Where the listener stopped in each episode of a podcast, for the episode list. */
export function useEpisodeProgress(podcastId: string | null, episodes: Episode[]) {
  const [progress, setProgress] = useState<Map<string, SavedProgress>>(new Map());
  const getToken = useAuthToken();
  const { isLoaded, isSignedIn } = useAuth();

  // Episode refetches hand back a new array with the same ids; don't reload for those.
  const idsKey = useMemo(() => episodes.map((e) => e.id).join(','), [episodes]);

  const load = useCallback(async (): Promise<Map<string, SavedProgress>> => {
    if (!podcastId || !idsKey) return new Map();
    const token = isSignedIn ? await getToken() : null;
    return loadPodcastProgress(podcastId, idsKey.split(','), token);
  }, [podcastId, idsKey, isSignedIn, getToken]);

  // Stable identity: Home lists this in a useFocusEffect, which re-runs (and refetches
  // everything) whenever its callback changes.
  const latestLoad = useRef(load);
  latestLoad.current = load;
  const refetch = useCallback(async () => {
    setProgress(await latestLoad.current());
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    (async () => {
      const data = await load();
      if (!cancelled) setProgress(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, load]);

  // The player saves while this list sits underneath it; reflect each save live.
  useEffect(
    () =>
      subscribeLocalProgress((episodeId, saved) => {
        setProgress((prev) => new Map(prev).set(episodeId, saved));
      }),
    [],
  );

  return { progress, refetch };
}
