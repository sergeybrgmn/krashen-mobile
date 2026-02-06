import { Audio, AVPlaybackStatus } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

export function useAudioPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
    });
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('Playback error:', status.error);
      }
      return;
    }
    setIsLoaded(true);
    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis / 1000);
    setDuration((status.durationMillis ?? 0) / 1000);
    if (status.playableDurationMillis != null) {
      setBuffered(status.playableDurationMillis / 1000);
    }
  }, []);

  const load = useCallback(
    async (url: string) => {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      setAudioUrl(url);
      setIsLoaded(false);
      setPosition(0);
      setDuration(0);
      setBuffered(0);
      setSpeed(1);
      setIsPlaying(false);

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { progressUpdateIntervalMillis: 250, shouldPlay: false },
        onPlaybackStatusUpdate,
      );
      soundRef.current = sound;
    },
    [onPlaybackStatusUpdate],
  );

  const play = useCallback(async () => {
    await soundRef.current?.playAsync();
  }, []);

  const pause = useCallback(async () => {
    await soundRef.current?.pauseAsync();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback(async (seconds: number) => {
    await soundRef.current?.setPositionAsync(Math.max(0, seconds * 1000));
  }, []);

  const skip = useCallback(
    async (delta: number) => {
      const newPos = Math.max(0, Math.min(position + delta, duration));
      await seek(newPos);
    },
    [position, duration, seek],
  );

  const changeSpeed = useCallback(async (newSpeed: number) => {
    setSpeed(newSpeed);
    await soundRef.current?.setRateAsync(newSpeed, true);
  }, []);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  return {
    isPlaying,
    isLoaded,
    position,
    duration,
    buffered,
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
