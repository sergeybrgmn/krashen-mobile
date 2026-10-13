import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { Episode } from '@/services/api';
import { SavedProgress, isFinished, resumePosition } from '@/services/playback-progress';

function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  episode: Episode;
  /** Where the listener stopped, if they've played it. */
  progress?: SavedProgress;
  onPress: () => void;
  /** When true, show a "PRO" badge on episodes the user can't access without upgrading. */
  showProBadge?: boolean;
}

export function EpisodeCard({ episode, progress, onPress, showProBadge = false }: Props) {
  const { t, i18n } = useTranslation();
  const isProLocked = showProBadge && !episode.is_free;

  // The player's measured duration beats the feed's, which is often rounded or missing.
  const total = progress?.duration ?? episode.duration;
  const played = !!progress && isFinished(progress.position, total);
  const inProgress = !!progress && !played && resumePosition(progress) > 0;
  const fraction = inProgress && total ? Math.min(1, progress.position / total) : null;
  const durationText =
    total == null
      ? null
      : inProgress
        ? t('home.timeLeft', { time: formatDuration(Math.max(0, total - progress.position)) })
        : formatDuration(total);
  const hasMeta = episode.published_at || durationText || played;

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
              {formatDate(episode.published_at, i18n.language)}
            </ThemedText>
          )}
          {episode.published_at && durationText && (
            <ThemedText style={styles.metaDot}>&middot;</ThemedText>
          )}
          {durationText && (
            <ThemedText style={[styles.metaText, inProgress && styles.metaProgress]}>
              {durationText}
            </ThemedText>
          )}
          {played && (episode.published_at || durationText) && (
            <ThemedText style={styles.metaDot}>&middot;</ThemedText>
          )}
          {played && (
            <View style={styles.played}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.cyan} />
              <ThemedText style={[styles.metaText, styles.metaProgress]}>
                {t('home.played')}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {fraction != null && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${fraction * 100}%` }]} />
        </View>
      )}

      <View style={styles.badgeRow}>
        {isProLocked && (
          <View style={styles.proBadge}>
            <ThemedText style={styles.proBadgeText}>PRO</ThemedText>
          </View>
        )}
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
  metaProgress: {
    color: Colors.cyan,
  },
  played: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  progressTrack: {
    height: 3,
    borderRadius: Radii.pill,
    backgroundColor: Colors.border,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.cyan,
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
  proBadge: {
    borderRadius: Radii.sm,
    backgroundColor: Colors.orange,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  proBadgeText: {
    fontSize: 11,
    color: '#0a0a0a',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
