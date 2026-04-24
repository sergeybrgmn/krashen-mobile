import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Sizes, Spacing } from '@/constants/theme';

interface Props {
  isRecording: boolean;
  isSubmitting: boolean;
  awaitingConfirmation: boolean;
  disabled: boolean;
  elapsedMs: number;
  maxDurationMs: number;
  onStart: () => void;
  onCancel: () => void;
  onSend: () => void;
  onRedo: () => void;
  onConfirmSend: () => void;
}

const AMBER_THRESHOLD_MS = 5_000;

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function PulsingDot() {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View style={[styles.dot, { opacity: anim }]} />
  );
}

export function AskControls({
  isRecording,
  isSubmitting,
  awaitingConfirmation,
  disabled,
  elapsedMs,
  maxDurationMs,
  onStart,
  onCancel,
  onSend,
  onRedo,
  onConfirmSend,
}: Props) {
  // State 2: Listening
  if (isRecording) {
    const remaining = Math.max(0, maxDurationMs - elapsedMs);
    const nearLimit = remaining <= AMBER_THRESHOLD_MS;
    return (
      <View style={styles.listeningBar}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <ThemedText style={styles.cancelIcon}>✕</ThemedText>
        </Pressable>

        <View style={styles.listeningCenter}>
          <PulsingDot />
          <ThemedText style={[styles.timer, nearLimit && styles.timerAmber]}>
            {formatTime(elapsedMs)} / {formatTime(maxDurationMs)}
          </ThemedText>
        </View>

        <Pressable style={styles.sendButton} onPress={onSend}>
          <ThemedText style={styles.sendIcon}>↑</ThemedText>
        </Pressable>
      </View>
    );
  }

  // State 2b: Awaiting confirmation (time's up — send or redo?)
  if (awaitingConfirmation) {
    return (
      <View style={styles.listeningBar}>
        <Pressable style={styles.redoButton} onPress={onRedo}>
          <Ionicons name="refresh" size={18} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.listeningCenter}>
          <ThemedText style={styles.readyText}>
            Time’s up — send or redo?
          </ThemedText>
        </View>

        <Pressable style={styles.sendButton} onPress={onConfirmSend}>
          <ThemedText style={styles.sendIcon}>↑</ThemedText>
        </Pressable>
      </View>
    );
  }

  // State 3: Thinking
  if (isSubmitting) {
    return (
      <View style={styles.thinkingContainer}>
        <Pressable style={[styles.askButton, styles.askButtonDisabled]} disabled>
          <Ionicons name="mic" size={18} color={Colors.black} style={styles.askIcon} />
          <ThemedText style={styles.askText}>Ask</ThemedText>
        </Pressable>
        <View style={styles.spinnerRow}>
          <ActivityIndicator color={Colors.cyan} size="small" />
          <ThemedText style={styles.thinkingText}>Thinking</ThemedText>
        </View>
      </View>
    );
  }

  // State 1: Idle
  return (
    <View style={styles.idleContainer}>
      <Pressable
        style={[styles.askButton, disabled && styles.askButtonDisabled]}
        onPress={onStart}
        disabled={disabled}
      >
        <Ionicons name="mic" size={18} color={Colors.black} style={styles.askIcon} />
          <ThemedText style={styles.askText}>Ask</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Idle
  idleContainer: {
    alignItems: 'center',
  },
  askButton: {
    minHeight: Sizes.askButton.minHeight,
    minWidth: Sizes.askButton.minWidth,
    backgroundColor: Colors.cyan,
    borderRadius: Radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xs,
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    width: '100%',
  },
  askButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  askIcon: {
    marginTop: 1,
  },
  askText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.black,
  },

  // Listening
  listeningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cancelButton: {
    width: Sizes.cancelButton,
    height: Sizes.cancelButton,
    borderRadius: Sizes.cancelButton / 2,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelIcon: {
    fontSize: 18,
    color: Colors.textPrimary,
  },
  redoButton: {
    width: Sizes.cancelButton,
    height: Sizes.cancelButton,
    borderRadius: Sizes.cancelButton / 2,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listeningCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.orange,
  },
  timer: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  timerAmber: {
    color: Colors.orange,
    fontWeight: '600',
  },
  readyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  sendButton: {
    width: Sizes.sendButton,
    height: Sizes.sendButton,
    borderRadius: Sizes.sendButton / 2,
    backgroundColor: Colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  sendIcon: {
    fontSize: 22,
    color: Colors.white,
    fontWeight: 'bold',
  },

  // Thinking
  thinkingContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  thinkingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
