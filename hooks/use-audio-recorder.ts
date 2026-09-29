import {
  RecordingOptions,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder as useExpoRecorder,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * AAC in .m4a container — compatible with OpenAI Whisper API.
 *
 * Built on expo-audio because expo-av is deprecated in SDK 54 and removed in 55,
 * and because `allowsRecording` configures the capture session on Android, where
 * expo-av only offered the iOS-only `allowsRecordingIOS`.
 *
 * Note: switching libraries did NOT by itself fix Android recording silence —
 * both produced full-length files with no audio in them.
 */
const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  // Mono at 44.1 kHz (our previous setting) produced full-length files of pure
  // silence on Android. Android's MediaRecorder is picky about rate/channel
  // combinations, so stay on the preset expo-audio actually ships and tests.
  // Whisper accepts stereo, and bitRate is unchanged so the upload size is too.
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
  /** True from a successful `record()` until `stop`/`cancel`, paused or not. */
  const activeRef = useRef(false);
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
    // Our own flag, not `recorder.isRecording`: iOS pauses the recorder during an
    // audio interruption (a call, Siri), which reads as not-recording. Gating on it
    // skipped the stop, left the UI stuck in its recording state, and left the
    // session in record mode — where iOS routes playback to the earpiece.
    if (!activeRef.current) return null;
    activeRef.current = false;
    setIsRecording(false);
    let uri: string | null = null;
    try {
      await recorder.stop();
      // `uri` is only populated once the recorder has finished writing.
      uri = recorder.uri;
    } catch {
      // Fall through: the session must go back to playback mode regardless.
    }
    await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
    return uri;
  }, [recorder]);

  const start = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      throw new Error('Microphone permission denied');
    }

    await setAudioModeAsync(RECORDING_AUDIO_MODE);
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
      throw e;
    }
    activeRef.current = true;

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
    const wasActive = activeRef.current;
    activeRef.current = false;
    try {
      if (wasActive) await recorder.stop();
    } catch {
      // The clip is being discarded either way.
    }
    await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
  }, [recorder]);

  return { isRecording, elapsedMs, start, stop, cancel };
}
