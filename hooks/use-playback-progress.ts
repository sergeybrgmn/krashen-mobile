import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuthToken } from '@/hooks/use-auth-token';
import { saveEpisodeProgress } from '@/services/api';
import { writeLocalProgress } from '@/services/playback-progress';

/** While playing: the device copy this often… */
const LOCAL_SAVE_MS = 5_000;
/** …and the server copy this often. Pause, seek, backgrounding and leaving the
 * player save straight away, so this only bounds the loss if the app is killed. */
const SERVER_SAVE_MS = 30_000;
/** After a seek or pause, wait for the position to settle before saving. */
const SETTLE_MS = 1_500;

interface Options {
  episodeId: string | null;
  position: number;
  duration: number;
  isPlaying: boolean;
  /** False until the player sits at its resume point; earlier, `position` is the
   * pre-seek 0 and saving it would wipe the saved spot. */
  ready: boolean;
  /** The listener played or seeked. Opening an episode and leaving changes nothing. */
  engaged: boolean;
}

/**
 * Saves where the listener is in the episode — on the device, and for signed-in
 * users on the server too, so it survives a reinstall. Resuming is the caller's
 * job (see `loadProgress` in services/playback-progress.ts).
 */
export function usePlaybackProgress({
  episodeId,
  position,
  duration,
  isPlaying,
  ready,
  engaged,
}: Options) {
  const getToken = useAuthToken();

  // Timers and cleanups read the latest values, not the ones they closed over.
  const latest = useRef({ episodeId, position, duration, ready, engaged });
  latest.current = { episodeId, position, duration, ready, engaged };

  const savedLocally = useRef<number | null>(null);
  const savedRemotely = useRef<number | null>(null);
  const lastPushAt = useRef(0);

  const save = useCallback(
    async (push: boolean) => {
      const { episodeId: id, position: pos, duration: dur, ready: isReady, engaged: isEngaged } =
        latest.current;
      if (!id || !isReady || !isEngaged || !Number.isFinite(pos)) return;
      const durationOrNull = dur > 0 ? dur : null;

      if (savedLocally.current === null || Math.abs(savedLocally.current - pos) >= 1) {
        savedLocally.current = pos;
        void writeLocalProgress(id, { position: pos, duration: durationOrNull, updatedAt: Date.now() });
      }

      if (!push) return;
      if (savedRemotely.current !== null && Math.abs(savedRemotely.current - pos) < 1) return;
      lastPushAt.current = Date.now();
      const token = await getToken();
      if (!token) return; // guest: device copy only
      try {
        await saveEpisodeProgress(token, id, pos, durationOrNull);
        savedRemotely.current = pos;
      } catch {
        // Offline or server down: the device copy is newer and wins on next open.
      }
    },
    [getToken],
  );

  // A new episode starts with nothing saved from this screen.
  useEffect(() => {
    savedLocally.current = null;
    savedRemotely.current = null;
    lastPushAt.current = 0;
  }, [episodeId]);

  // While playing: device every 5 s, server every 30 s.
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      void save(Date.now() - lastPushAt.current >= SERVER_SAVE_MS);
    }, LOCAL_SAVE_MS);
    return () => clearInterval(timer);
  }, [isPlaying, save]);

  // Paused, finished, or seeking while paused: save both once the position settles.
  useEffect(() => {
    if (isPlaying) return;
    const timer = setTimeout(() => void save(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, position, save]);

  // Leaving the app — it may never come back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void save(true);
    });
    return () => sub.remove();
  }, [save]);

  // Leaving the player.
  useEffect(() => {
    return () => {
      void save(true);
    };
  }, [save]);
}
