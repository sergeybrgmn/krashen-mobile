import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { Episode } from '@/services/api';

function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  episode: Episode;
  onPress: () => void;
}

export function EpisodeCard({ episode, onPress }: Props) {
  const hasMeta = episode.published_at || episode.duration != null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <ThemedText style={styles.title} numberOfLines={2}>
        {episode.title}
      </ThemedText>

      {hasMeta && (
        <View style={styles.metaRow}>
          {episode.published_at && (
            <ThemedText style={styles.metaText}>
              {formatDate(episode.published_at)}
            </ThemedText>
          )}
          {episode.published_at && episode.duration != null && (
            <ThemedText style={styles.metaDot}>&middot;</ThemedText>
          )}
          {episode.duration != null && (
            <ThemedText style={styles.metaText}>
              {formatDuration(episode.duration)}
            </ThemedText>
          )}
        </View>
      )}

      <View style={styles.badgeRow}>
        {episode.explanation_languages.map((lang) => (
          <View key={lang} style={styles.badge}>
            <ThemedText style={styles.badgeText}>
              {lang.toUpperCase()}
            </ThemedText>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  pressed: {
    borderColor: Colors.cyan,
    backgroundColor: Colors.cardLight,
  },
  title: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  metaDot: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
    minHeight: 22,
  },
  badge: {
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.cyan,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    color: Colors.cyan,
    fontWeight: '600',
  },
});
