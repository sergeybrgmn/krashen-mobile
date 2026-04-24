import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

/** AAC in .m4a container — compatible with OpenAI Whisper API */
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

const TICK_INTERVAL_MS = 250;

interface Options {
  maxDurationMs?: number;
  onLimitReached?: (uri: string | null) => void;
}

export function useAudioRecorder(options: Options = {}) {
  const { maxDurationMs, onLimitReached } = options;

  const recordingRef = useRef<Audio.Recording | null>(null);
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
    if (!recordingRef.current) return null;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      // Restore audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      return uri;
    } catch {
      recordingRef.current = null;
      setIsRecording(false);
      return null;
    }
  }, []);

  const start = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      throw new Error('Microphone permission denied');
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(RECORDING_OPTIONS);
    await recording.startAsync();
    recordingRef.current = recording;
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
  }, [stop]);

  const cancel = useCallback(async () => {
    clearTick();
    if (!recordingRef.current) {
      setIsRecording(false);
      return;
    }
    try {
      await recordingRef.current.stopAndUnloadAsync();
    } catch {
      // ignore
    }
    recordingRef.current = null;
    setIsRecording(false);

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
  }, []);

  return { isRecording, elapsedMs, start, stop, cancel };
}
