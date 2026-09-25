import {
  setAudioModeAsync,
  useAudioPlayer as useExpoPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';

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
  const player = useExpoPlayer(undefined, { updateInterval: STATUS_INTERVAL_MS });
  const status = useAudioPlayerStatus(player);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    void setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      allowsRecording: false,
    });
  }, []);

  const load = useCallback(
    async (url: string) => {
      setAudioUrl(url);
      setSpeed(1);
      player.replace({ uri: url });
      player.setPlaybackRate(1);
    },
    [player],
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
      await player.seekTo(Math.max(0, seconds));
    },
    [player],
  );

  const skip = useCallback(
    async (delta: number) => {
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
