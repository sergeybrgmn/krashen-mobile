import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { Segment, WordExplanation } from '@/services/api';

interface Props {
  segments: Segment[];
  explanations: Record<string, { words: WordExplanation[] }>;
  currentTime: number;
  loading: boolean;
  onWordPress: (word: WordExplanation) => void;
}

function findCurrentSegmentIndex(segments: Segment[], time: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let result = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

function SegmentText({
  segment,
  segmentIndex,
  explanations,
  onWordPress,
  dimmed,
}: {
  segment: Segment;
  segmentIndex: number;
  explanations: Record<string, { words: WordExplanation[] }>;
  onWordPress: (word: WordExplanation) => void;
  dimmed: boolean;
}) {
  const words = explanations[String(segmentIndex)]?.words ?? [];
  const text = segment.text;

  if (words.length === 0) {
    return (
      <ThemedText style={[styles.segmentText, dimmed && styles.dimmed]}>
        {text}
      </ThemedText>
    );
  }

  // Build spans: sort words by start_char, render plain text between them
  const sorted = [...words].sort((a, b) => a.start_char - b.start_char);
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  sorted.forEach((w, i) => {
    if (w.start_char > lastEnd) {
      parts.push(
        <ThemedText
          key={`plain-${i}`}
          style={[styles.segmentText, dimmed && styles.dimmed]}
        >
          {text.slice(lastEnd, w.start_char)}
        </ThemedText>,
      );
    }
    parts.push(
      <Pressable key={`word-${i}`} onPress={() => onWordPress(w)}>
        <ThemedText style={[styles.clickableWord, dimmed && styles.dimmed]}>
          {text.slice(w.start_char, w.end_char)}
        </ThemedText>
      </Pressable>,
    );
    lastEnd = w.end_char;
  });

  if (lastEnd < text.length) {
    parts.push(
      <ThemedText
        key="plain-end"
        style={[styles.segmentText, dimmed && styles.dimmed]}
      >
        {text.slice(lastEnd)}
      </ThemedText>,
    );
  }

  return <View style={styles.segmentRow}>{parts}</View>;
}

export function TranscriptPanel({
  segments,
  explanations,
  currentTime,
  loading,
  onWordPress,
}: Props) {
  const currentIdx = useMemo(
    () => findCurrentSegmentIndex(segments, currentTime),
    [segments, currentTime],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={Colors.cyan} />
      </View>
    );
  }

  if (segments.length === 0) return null;

  const prevIdx = currentIdx > 0 ? currentIdx - 1 : -1;

  return (
    <View style={styles.container}>
      {prevIdx >= 0 && (
        <SegmentText
          segment={segments[prevIdx]}
          segmentIndex={prevIdx}
          explanations={explanations}
          onWordPress={onWordPress}
          dimmed
        />
      )}
      {currentIdx >= 0 && (
        <SegmentText
          segment={segments[currentIdx]}
          segmentIndex={currentIdx}
          explanations={explanations}
          onWordPress={onWordPress}
          dimmed={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  segmentText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  dimmed: {
    opacity: 0.5,
  },
  clickableWord: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textPrimary,
    textDecorationLine: 'underline',
    textDecorationColor: Colors.cyan,
  },
});
