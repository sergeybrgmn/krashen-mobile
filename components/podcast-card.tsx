import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Sizes, Spacing } from '@/constants/theme';
import { MEDIA_USER_AGENT } from '@/constants/user-agent';
import { Podcast } from '@/services/api';

interface Props {
  podcast: Podcast;
  selected: boolean;
  onPress: () => void;
}

export function PodcastCard({ podcast, selected, onPress }: Props) {
  // expo-image rather than RN's Image: disk caching for art we re-render on
  // every Home visit, and the same loader `user-avatar` already uses.
  //
  // Cover URLs come straight from third-party RSS feeds, so some will always be
  // dead or blocked. Falling back to the initial keeps that a readable tile
  // rather than a hole in the row. Tracked by URL, not a boolean, so a recycled
  // list row doesn't inherit the previous podcast's failure.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showCover = Boolean(podcast.cover_url) && failedUrl !== podcast.cover_url;

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={[styles.imageWrapper, selected && styles.selected]}>
        {showCover ? (
          <Image
            source={{
              uri: podcast.cover_url,
              headers: { 'User-Agent': MEDIA_USER_AGENT },
            }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            onError={() => setFailedUrl(podcast.cover_url)}
          />
        ) : (
          <View style={styles.placeholder}>
            <ThemedText style={styles.placeholderText}>
              {podcast.title.charAt(0)}
            </ThemedText>
          </View>
        )}
      </View>
      <ThemedText numberOfLines={2} style={styles.title}>
        {podcast.title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: Sizes.podcastCard,
    marginRight: Spacing.md,
  },
  imageWrapper: {
    width: Sizes.podcastCard,
    height: Sizes.podcastCard,
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: Colors.cyan,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 40,
    color: Colors.textMuted,
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
