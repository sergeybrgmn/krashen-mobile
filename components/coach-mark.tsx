import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { RefObject, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { posthog } from '@/services/analytics';

/** Once-only flag: written on complete or skip so the coachmark never reappears. */
export const COACHMARK_STORAGE_KEY = 'onboarding.player.v1';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CoachStep {
  /** The on-screen element this step points at, measured via measureInWindow. */
  targetRef: RefObject<View | null>;
  caption: string;
}

interface Props {
  steps: CoachStep[];
  onDismiss: () => void;
}

const HIGHLIGHT_PADDING = 8;
const CARD_ESTIMATED_HEIGHT = 120;

/**
 * Lightweight, dismissible, once-only onboarding overlay. Each step highlights a
 * measured target with a one-line caption. If a target can't be measured, that
 * step degrades to a centered card rather than crashing. No new dependency —
 * built from `Modal` + `react-native-reanimated`.
 */
export function CoachMark({ steps, onDismiss }: Props) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [measured, setMeasured] = useState(false);

  const opacity = useSharedValue(0);
  const pulse = useSharedValue(1);

  // Fire once when the coachmark first appears.
  useEffect(() => {
    posthog?.capture('coachmark_shown');
  }, []);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 250 });
    pulse.value = withRepeat(withTiming(1.06, { duration: 700 }), -1, true);
  }, [opacity, pulse]);

  // Measure the current step's target. Degrade to a centered card when the
  // target is missing, zero-sized, or can't be measured.
  useEffect(() => {
    let cancelled = false;
    setMeasured(false);
    setRect(null);
    const node = steps[stepIndex]?.targetRef.current;
    if (!node || typeof node.measureInWindow !== 'function') {
      setMeasured(true);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      if (cancelled) return;
      setRect(width > 0 && height > 0 ? { x, y, width, height } : null);
      setMeasured(true);
    });
    return () => {
      cancelled = true;
    };
  }, [stepIndex, steps]);

  const finish = useCallback(
    (event: 'coachmark_completed' | 'coachmark_skipped') => {
      posthog?.capture(event);
      void AsyncStorage.setItem(COACHMARK_STORAGE_KEY, '1');
      onDismiss();
    },
    [onDismiss],
  );

  const advance = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      finish('coachmark_completed');
    }
  }, [stepIndex, steps.length, finish]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  if (steps.length === 0) return null;

  const isLast = stepIndex === steps.length - 1;
  const caption = steps[stepIndex]?.caption ?? '';

  const screen = Dimensions.get('window');
  // Place the caption card below the highlight when there's room, else above.
  let cardTop: number | undefined;
  if (rect) {
    const below = rect.y + rect.height + HIGHLIGHT_PADDING + Spacing.md;
    cardTop =
      below + CARD_ESTIMATED_HEIGHT < screen.height
        ? below
        : Math.max(Spacing.xl, rect.y - HIGHLIGHT_PADDING - CARD_ESTIMATED_HEIGHT - Spacing.md);
  }

  const cardInner = (
    <>
      <ThemedText style={styles.caption}>{caption}</ThemedText>
      <View style={styles.actions}>
        <Pressable onPress={() => finish('coachmark_skipped')} hitSlop={8}>
          <ThemedText style={styles.skip}>{t('coach.skip')}</ThemedText>
        </Pressable>
        <View style={styles.progress}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
          ))}
        </View>
        <Pressable style={styles.nextButton} onPress={advance} hitSlop={8}>
          <ThemedText style={styles.nextText}>
            {isLast ? t('coach.gotIt') : t('coach.next')}
          </ThemedText>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={16} color={Colors.black} />
        </Pressable>
      </View>
    </>
  );

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={() => finish('coachmark_skipped')}
    >
      <Animated.View style={[styles.overlay, overlayStyle]}>
        {/* Tap the dim backdrop to advance. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={advance} />

        {measured && rect && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              ringStyle,
              {
                left: rect.x - HIGHLIGHT_PADDING,
                top: rect.y - HIGHLIGHT_PADDING,
                width: rect.width + HIGHLIGHT_PADDING * 2,
                height: rect.height + HIGHLIGHT_PADDING * 2,
              },
            ]}
          />
        )}

        {measured &&
          (rect ? (
            <View style={[styles.card, { top: cardTop, left: Spacing.xl, right: Spacing.xl }]}>
              {cardInner}
            </View>
          ) : (
            <View style={styles.centeredWrap} pointerEvents="box-none">
              <View style={styles.cardCentered}>{cardInner}</View>
            </View>
          ))}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.cyan,
    borderRadius: Radii.md,
    backgroundColor: 'transparent',
  },
  card: {
    position: 'absolute',
    backgroundColor: Colors.cardSolid,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  centeredWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  cardCentered: {
    backgroundColor: Colors.cardSolid,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  caption: {
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  skip: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.cyan,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.cyan,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  nextText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.black,
  },
});
