import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';

interface Props {
  title: string;
  onPress: () => void;
}

export function EpisodePill({ title, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <ThemedText style={styles.text}>{title}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  pressed: {
    borderColor: Colors.cyan,
    backgroundColor: Colors.cardLight,
  },
  text: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
