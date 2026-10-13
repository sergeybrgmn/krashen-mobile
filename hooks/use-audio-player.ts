import {
  type AudioMetadata,
  setAudioModeAsync,
  useAudioPlayer as useExpoPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MEDIA_USER_AGENT } from '@/constants/user-agent';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

/** Matches the cadence expo-av was polled at, so the progress bar moves as before. */
const STATUS_INTERVAL_MS = 250;

/**
 * Episode playback, on expo-audio.
 *
 * Migrated off expo-av (deprecated in SDK 54, removed in SDK 55), which is also
 * what broke Android recording. Keeping both halves of the audio stack on one
 * module means a single native audio session rather than two modules contending
 * for it. `shouldPlayInBackground` replaces expo-av's `staysActiveInBackground`
 * and, unlike it, applies on Android as well as iOS.
 *
 * Times are seconds throughout — expo-audio's native unit — where expo-av worked
 * in milliseconds.
 */
export function useAudioPlayer() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lockScreen, setLockScreen] = useState<AudioMetadata | null>(null);
  const [speed, setSpeed] = useState(1);
  // Resume point for the current source, applied once it has loaded.
  const [startAt, setStartAt] = useState(0);
  const [ready, setReady] = useState(false);
  // The listener played or seeked since the source was loaded.
  const [engaged, setEngaged] = useState(false);

  // The source is a hook argument, not something we swap in later: expo-audio
  // rebuilds the underlying player whenever it changes (see `useReleasingSharedObject`
  // in ExpoAudio.js). Constructing with no source and calling `replace()` afterwards
  // leaves the player permanently unloaded.
  const source = useMemo(
    () =>
      audioUrl ? { uri: audioUrl, headers: { 'User-Agent': MEDIA_USER_AGENT } } : null,
    [audioUrl],
  );
  const player = useExpoPlayer(source, { updateInterval: STATUS_INTERVAL_MS });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      allowsRecording: false,
    });
  }, []);

  // Lock-screen and notification controls. On Android this is also what starts
  // expo-audio's media-playback foreground service: `shouldPlayInBackground` alone
  // keeps the player going in the background but with no service behind it, so the
  // OS may throttle or stop playback once the screen locks. Re-applied each time the
  // player is rebuilt for a new source; releasing a player clears its controls natively.
  useEffect(() => {
    if (!source || !lockScreen) return;
    player.setActiveForLockScreen(true, lockScreen, {
      showSeekForward: true,
      showSeekBackward: true,
    });
  }, [player, source, lockScreen]);

  // Jump to the resume point once the source has loaded — exactly once per load:
  // Android reports buffering (including the buffering this seek causes) as
  // `isLoaded: false`, so an effect cleanup can't be what guards the seek. Checks
  // the native player too: right after a source swap the status hook can still
  // report the previous player's state for a render.
  const startAppliedFor = useRef<typeof source>(null);
  useEffect(() => {
    if (ready || !source || startAppliedFor.current === source) return;
    if (!status.isLoaded || !player.isLoaded) return;
    startAppliedFor.current = source;
    (async () => {
      if (startAt > 0) await player.seekTo(startAt);
      if (startAppliedFor.current === source) setReady(true);
    })();
  }, [ready, source, status.isLoaded, player, startAt]);

  // Covers lock-screen and headphone play as well as the in-app button.
  useEffect(() => {
    if (status.playing) setEngaged(true);
  }, [status.playing]);

  const load = useCallback(
    async (url: string, metadata?: AudioMetadata, startPosition = 0) => {
      // Swapping the url rebuilds the player, which resets the rate to 1x.
      setSpeed(1);
      setAudioUrl(url);
      setLockScreen(metadata ?? null);
      setStartAt(startPosition);
      startAppliedFor.current = null;
      setReady(false);
      setEngaged(false);
    },
    [],
  );

  const play = useCallback(async () => {
    player.play();
  }, [player]);

  const pause = useCallback(async () => {
    player.pause();
  }, [player]);

  const togglePlayPause = useCallback(async () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, status.playing]);

  const seek = useCallback(
    async (seconds: number) => {
      setEngaged(true);
      await player.seekTo(Math.max(0, seconds));
    },
    [player],
  );

  const skip = useCallback(
    async (delta: number) => {
      setEngaged(true);
      const target = Math.max(0, Math.min(status.currentTime + delta, status.duration));
      await player.seekTo(target);
    },
    [player, status.currentTime, status.duration],
  );

  const changeSpeed = useCallback(
    async (newSpeed: number) => {
      setSpeed(newSpeed);
      player.setPlaybackRate(newSpeed);
    },
    [player],
  );

  return {
    isPlaying: status.playing,
    isLoaded: status.isLoaded,
    position: status.currentTime,
    duration: status.duration,
    // expo-audio reports only `isBuffering` (a boolean), with no playable-duration
    // equivalent to expo-av's `playableDurationMillis`, so the progress bar's grey
    // buffered track has no data to draw. Kept in the API so callers are unchanged.
    buffered: 0,
    /** True once the loaded episode sits at its start (resume) position. Before
     * that, `position` is the pre-seek 0 and must not be saved as progress. */
    ready,
    /** The listener played or seeked since load — opening an episode and leaving isn't progress. */
    engaged,
    speed,
    audioUrl,
    speedOptions: SPEED_OPTIONS,
    load,
    play,
    pause,
    togglePlayPause,
    seek,
    skip,
    changeSpeed,
  };
}
