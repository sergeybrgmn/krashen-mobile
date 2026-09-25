import {
  AudioQuality,
  IOSOutputFormat,
  RecordingOptions,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder as useExpoRecorder,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * AAC in .m4a container — compatible with OpenAI Whisper API.
 *
 * Built on expo-audio rather than expo-av: expo-av's Android recorder produced
 * correctly-sized files containing pure silence on SDK 54 / RN 0.81 while iOS was
 * unaffected, and its `RecordingOptionsAndroid` exposes no audio-source knob to
 * work around it. expo-audio also replaces the iOS-only `allowsRecordingIOS`
 * audio-mode flag with a cross-platform `allowsRecording`, so the session is
 * actually configured for capture on Android. expo-av is deprecated in SDK 54 and
 * removed in SDK 55 regardless.
 */
const RECORDING_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

/** Session for normal playback: capture off, background playback on. */
const PLAYBACK_AUDIO_MODE = {
  allowsRecording: false,
  playsInSilentMode: true,
  shouldPlayInBackground: true,
} as const;

/** Session while capturing. Unlike expo-av's iOS-only flag, this reaches Android. */
const RECORDING_AUDIO_MODE = {
  allowsRecording: true,
  playsInSilentMode: true,
} as const;

const TICK_INTERVAL_MS = 250;

interface Options {
  maxDurationMs?: number;
  onLimitReached?: (uri: string | null) => void;
}

export function useAudioRecorder(options: Options = {}) {
  const { maxDurationMs, onLimitReached } = options;

  const recorder = useExpoRecorder(RECORDING_OPTIONS);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxMsRef = useRef<number | undefined>(maxDurationMs);
  const onLimitRef = useRef<Options['onLimitReached']>(onLimitReached);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    maxMsRef.current = maxDurationMs;
    onLimitRef.current = onLimitReached;
  }, [maxDurationMs, onLimitReached]);

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const stop = useCallback(async (): Promise<string | null> => {
    clearTick();
    if (!recorder.isRecording) return null;
    try {
      await recorder.stop();
      // `uri` is only populated once the recorder has finished writing.
      const uri = recorder.uri;
      setIsRecording(false);
      await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
      return uri;
    } catch {
      setIsRecording(false);
      return null;
    }
  }, [recorder]);

  const start = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      throw new Error('Microphone permission denied');
    }

    await setAudioModeAsync(RECORDING_AUDIO_MODE);
    await recorder.prepareToRecordAsync();
    recorder.record();

    setIsRecording(true);
    setElapsedMs(0);

    const startedAt = Date.now();
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setElapsedMs(elapsed);
      const limit = maxMsRef.current;
      if (limit && elapsed >= limit) {
        clearTick();
        void (async () => {
          const uri = await stop();
          onLimitRef.current?.(uri);
        })();
      }
    }, TICK_INTERVAL_MS);
  }, [recorder, stop]);

  const cancel = useCallback(async () => {
    clearTick();
    setIsRecording(false);
    try {
      if (recorder.isRecording) await recorder.stop();
    } catch {
      // The clip is being discarded either way.
    }
    await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
  }, [recorder]);

  return { isRecording, elapsedMs, start, stop, cancel };
}
