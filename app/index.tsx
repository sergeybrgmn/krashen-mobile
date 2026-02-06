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

import { AnswerLanguageModal } from '@/components/answer-language-modal';
import { EpisodePill } from '@/components/episode-pill';
import { LanguagePicker } from '@/components/language-picker';
import { PodcastCard } from '@/components/podcast-card';
import { ThemedText } from '@/components/themed-text';
import { getAnswerLanguages } from '@/constants/answer-languages';
import { Colors, Spacing } from '@/constants/theme';
import { useAnswerLanguage } from '@/hooks/use-answer-language';
import { useEpisodes } from '@/hooks/use-episodes';
import { usePodcasts } from '@/hooks/use-podcasts';
import { Episode, Podcast } from '@/services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { podcasts, loading: podcastsLoading, languages } = usePodcasts();
  const { answerLanguage, loaded: answerLangLoaded, saveAnswerLanguage } = useAnswerLanguage();

  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const { episodes, loading: episodesLoading } = useEpisodes(selectedPodcast?.id ?? null);

  const [answerModalVisible, setAnswerModalVisible] = useState(false);
  const [pendingEpisode, setPendingEpisode] = useState<Episode | null>(null);

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

  const handleEpisodeTap = useCallback(
    (episode: Episode) => {
      if (!selectedPodcast || !answerLangLoaded) return;

      const allowedLangs = getAnswerLanguages(selectedPodcast.language);

      if (answerLanguage && allowedLangs.includes(answerLanguage)) {
        router.push({
          pathname: '/player',
          params: {
            podcastId: selectedPodcast.id,
            episodeId: episode.id,
            targetLanguage: answerLanguage,
          },
        });
      } else {
        setPendingEpisode(episode);
        setAnswerModalVisible(true);
      }
    },
    [selectedPodcast, answerLanguage, answerLangLoaded, router],
  );

  const handleAnswerConfirm = useCallback(
    async (lang: string) => {
      await saveAnswerLanguage(lang);
      setAnswerModalVisible(false);
      if (selectedPodcast && pendingEpisode) {
        router.push({
          pathname: '/player',
          params: {
            podcastId: selectedPodcast.id,
            episodeId: pendingEpisode.id,
            targetLanguage: lang,
          },
        });
      }
      setPendingEpisode(null);
    },
    [selectedPodcast, pendingEpisode, saveAnswerLanguage, router],
  );

  const answerOptions = selectedPodcast
    ? getAnswerLanguages(selectedPodcast.language)
    : ['en'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.push('/about')}>
          <ThemedText type="link" style={styles.infoBanner}>
            What is Lemino?
          </ThemedText>
        </Pressable>

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
                  <EpisodePill
                    key={ep.id}
                    title={ep.title}
                    onPress={() => handleEpisodeTap(ep)}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <AnswerLanguageModal
        visible={answerModalVisible}
        options={answerOptions}
        onConfirm={handleAnswerConfirm}
        onCancel={() => {
          setAnswerModalVisible(false);
          setPendingEpisode(null);
        }}
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
  infoBanner: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
