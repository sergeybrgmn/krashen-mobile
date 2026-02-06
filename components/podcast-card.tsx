import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Sizes, Spacing } from '@/constants/theme';
import { Podcast } from '@/services/api';

interface Props {
  podcast: Podcast;
  selected: boolean;
  onPress: () => void;
}

export function PodcastCard({ podcast, selected, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={[styles.imageWrapper, selected && styles.selected]}>
        {podcast.cover_url ? (
          <Image source={{ uri: podcast.cover_url }} style={styles.image} />
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
