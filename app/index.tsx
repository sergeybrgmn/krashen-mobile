import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EpisodeCard } from '@/components/episode-card';
import { LanguageChoiceModal } from '@/components/language-choice-modal';
import { LanguagePicker } from '@/components/language-picker';
import { PodcastCard } from '@/components/podcast-card';
import { ProfileDrawer } from '@/components/profile-drawer';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Colors, Spacing } from '@/constants/theme';
import { useExplanationLanguage } from '@/hooks/use-explanation-language';
import { useEpisodes } from '@/hooks/use-episodes';
import { useMe } from '@/hooks/use-me';
import { usePodcasts } from '@/hooks/use-podcasts';
import { Episode, Podcast } from '@/services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { podcasts, loading: podcastsLoading, languages } = usePodcasts();
  const { me } = useMe();
  const showProBadge = !me?.is_subscribed;
  const {
    explanationLanguage,
    loaded: explanationLangLoaded,
    saveExplanationLanguage,
  } = useExplanationLanguage();

  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const { episodes, loading: episodesLoading } = useEpisodes(selectedPodcast?.id ?? null);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingEpisode, setPendingEpisode] = useState<Episode | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const filteredPodcasts = useMemo(() => {
    if (!languageFilter) return podcasts;
    return podcasts.filter(
      (p) => p.language.toLowerCase() === languageFilter,
    );
  }, [podcasts, languageFilter]);

  const handleLanguageFilter = useCallback(
    (lang: string | null) => {
      setLanguageFilter(lang);
      if (
        selectedPodcast &&
        lang &&
        selectedPodcast.language.toLowerCase() !== lang
      ) {
        setSelectedPodcast(null);
      }
    },
    [selectedPodcast],
  );

  const handleSelectPodcast = useCallback((podcast: Podcast) => {
    setSelectedPodcast(podcast);
  }, []);

  const openPlayer = useCallback(
    (episode: Episode, lang: string) => {
      if (!selectedPodcast) return;
      router.push({
        pathname: '/player',
        params: {
          podcastId: selectedPodcast.id,
          episodeId: episode.id,
          targetLanguage: lang,
        },
      });
    },
    [selectedPodcast, router],
  );

  const handleEpisodeTap = useCallback(
    (episode: Episode) => {
      if (!selectedPodcast || !explanationLangLoaded) return;

      const options = episode.explanation_languages ?? [];
      if (options.length === 0) return;

      // Saved pick works for this episode → go straight in.
      if (explanationLanguage && options.includes(explanationLanguage)) {
        openPlayer(episode, explanationLanguage);
        return;
      }
      // Only one option → pick silently, persist for next time.
      if (options.length === 1) {
        void saveExplanationLanguage(options[0]);
        openPlayer(episode, options[0]);
        return;
      }
      // Multiple options and no valid saved pick → ask.
      setPendingEpisode(episode);
      setPickerVisible(true);
    },
    [selectedPodcast, explanationLanguage, explanationLangLoaded, saveExplanationLanguage, openPlayer],
  );

  const handlePickerConfirm = useCallback(
    async (lang: string) => {
      await saveExplanationLanguage(lang);
      setPickerVisible(false);
      if (pendingEpisode) {
        openPlayer(pendingEpisode, lang);
      }
      setPendingEpisode(null);
    },
    [pendingEpisode, saveExplanationLanguage, openPlayer],
  );

  const pickerOptions = pendingEpisode?.explanation_languages ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <UserAvatar onPress={() => setDrawerVisible(true)} />
          <Pressable onPress={() => router.push('/about')}>
            <ThemedText type="link" style={styles.infoBanner}>
              What is Krashen?
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText type="title" style={styles.pageTitle}>
          Podcasts
        </ThemedText>

        <LanguagePicker
          languages={languages}
          selected={languageFilter}
          onSelect={handleLanguageFilter}
        />

        {podcastsLoading ? (
          <ActivityIndicator
            color={Colors.cyan}
            size="large"
            style={styles.loader}
          />
        ) : (
          <FlatList
            data={filteredPodcasts}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.podcastList}
            renderItem={({ item }) => (
              <PodcastCard
                podcast={item}
                selected={selectedPodcast?.id === item.id}
                onPress={() => handleSelectPodcast(item)}
              />
            )}
          />
        )}

        <View style={styles.episodeSection}>
          {!selectedPodcast ? (
            <ThemedText type="small">
              Select a podcast to see episodes.
            </ThemedText>
          ) : episodesLoading ? (
            <ThemedText type="small">Loading episodes...</ThemedText>
          ) : episodes.length === 0 ? (
            <ThemedText type="small">No episodes</ThemedText>
          ) : (
            <>
              <ThemedText type="subtitle" style={styles.episodeHeader}>
                {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
              </ThemedText>
              <View style={styles.episodeList}>
                {episodes.map((ep) => (
                  <EpisodeCard
                    key={ep.id}
                    episode={ep}
                    showProBadge={showProBadge}
                    onPress={() => handleEpisodeTap(ep)}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <LanguageChoiceModal
        visible={pickerVisible}
        title="Choose the language for explanations"
        options={pickerOptions}
        initial={explanationLanguage}
        onConfirm={handlePickerConfirm}
        onCancel={() => {
          setPickerVisible(false);
          setPendingEpisode(null);
        }}
      />

      <ProfileDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoBanner: {
    fontSize: 14,
  },
  pageTitle: {
    marginBottom: Spacing.lg,
  },
  loader: {
    marginVertical: Spacing.xxl,
  },
  podcastList: {
    paddingVertical: Spacing.lg,
  },
  episodeSection: {
    marginTop: Spacing.xl,
  },
  episodeHeader: {
    marginBottom: Spacing.md,
  },
  episodeList: {
    flexDirection: 'column',
  },
});
