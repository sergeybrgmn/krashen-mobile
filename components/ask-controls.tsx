import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Sizes, Spacing } from '@/constants/theme';

interface Props {
  isRecording: boolean;
  isSubmitting: boolean;
  disabled: boolean;
  onStart: () => void;
  onCancel: () => void;
  onSend: () => void;
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

function ListeningDots() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => (c + 1) % 6);
    }, 220);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemedText style={styles.listeningText}>
      Listening{"'".repeat(count)}
    </ThemedText>
  );
}

export function AskControls({
  isRecording,
  isSubmitting,
  disabled,
  onStart,
  onCancel,
  onSend,
}: Props) {
  // State 2: Listening
  if (isRecording) {
    return (
      <View style={styles.listeningBar}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <ThemedText style={styles.cancelIcon}>✕</ThemedText>
        </Pressable>

        <View style={styles.listeningCenter}>
          <PulsingDot />
          <ListeningDots />
        </View>

        <Pressable style={styles.sendButton} onPress={onSend}>
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
          <ThemedText style={styles.askText}>🎙 Ask</ThemedText>
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
        <ThemedText style={styles.askText}>🎙 Ask</ThemedText>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
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
  listeningText: {
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
