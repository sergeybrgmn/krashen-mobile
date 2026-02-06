import { useCallback, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Sizes, Spacing } from '@/constants/theme';

interface Props {
  position: number;
  duration: number;
  buffered: number;
  disabled: boolean;
  onSeek: (seconds: number) => void;
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function ProgressBar({ position, duration, buffered, disabled, onSeek }: Props) {
  const trackWidth = useRef(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubPos, setScrubPos] = useState(0);

  const positionToUse = scrubbing ? scrubPos : position;
  const progress = duration > 0 ? positionToUse / duration : 0;
  const bufferedPct = duration > 0 ? buffered / duration : 0;

  const clampSeek = useCallback(
    (pageX: number, layoutX: number) => {
      if (disabled || duration <= 0) return 0;
      const frac = Math.max(0, Math.min(1, (pageX - layoutX) / trackWidth.current));
      return frac * duration;
    },
    [disabled, duration],
  );

  const trackLayoutX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (evt) => {
        setScrubbing(true);
        const s = clampSeek(evt.nativeEvent.pageX, trackLayoutX.current);
        setScrubPos(s);
      },
      onPanResponderMove: (evt) => {
        const s = clampSeek(evt.nativeEvent.pageX, trackLayoutX.current);
        setScrubPos(s);
      },
      onPanResponderRelease: (evt) => {
        const s = clampSeek(evt.nativeEvent.pageX, trackLayoutX.current);
        onSeek(s);
        setScrubbing(false);
      },
      onPanResponderTerminate: () => {
        setScrubbing(false);
      },
    }),
  ).current;

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
    trackLayoutX.current = e.nativeEvent.layout.x;
  }, []);

  // Measure absolute X for accurate scrubbing
  const trackRef = useRef<View>(null);
  const onTrackLayoutFull = useCallback(
    (e: LayoutChangeEvent) => {
      onTrackLayout(e);
      trackRef.current?.measureInWindow((x) => {
        trackLayoutX.current = x;
      });
    },
    [onTrackLayout],
  );

  return (
    <View style={styles.container}>
      <ThemedText style={styles.time}>
        {formatTime(positionToUse)}
      </ThemedText>

      <View
        ref={trackRef}
        style={styles.track}
        onLayout={onTrackLayoutFull}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBg} />
        <View style={[styles.trackBuffered, { width: `${bufferedPct * 100}%` }]} />
        <View style={[styles.trackProgress, { width: `${progress * 100}%` }]} />
        <View
          style={[
            styles.thumb,
            { left: `${progress * 100}%` },
          ]}
        />
      </View>

      <ThemedText style={styles.time}>
        {formatTime(duration)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  time: {
    fontSize: 13,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'center',
  },
  track: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: Sizes.progressTrack,
    backgroundColor: Colors.border,
    borderRadius: 5,
  },
  trackBuffered: {
    position: 'absolute',
    left: 0,
    height: Sizes.progressTrack,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderRadius: 5,
  },
  trackProgress: {
    position: 'absolute',
    left: 0,
    height: Sizes.progressTrack,
    backgroundColor: Colors.cyan,
    borderRadius: 5,
  },
  thumb: {
    position: 'absolute',
    width: Sizes.progressThumb,
    height: Sizes.progressThumb,
    borderRadius: Sizes.progressThumb / 2,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.cyan,
    marginLeft: -(Sizes.progressThumb / 2),
    top: (30 - Sizes.progressThumb) / 2,
  },
});
