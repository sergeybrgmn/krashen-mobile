import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AskControls } from '@/components/ask-controls';
import { AnswerBlock } from '@/components/answer-block';
import { ErrorModal } from '@/components/error-modal';
import { PlaybackCard } from '@/components/playback-card';
import { ProfileDrawer } from '@/components/profile-drawer';
import { ThemedText } from '@/components/themed-text';
import { TranscriptPanel } from '@/components/transcript-panel';
import { UserAvatar } from '@/components/user-avatar';
import { WordExplanationModal } from '@/components/word-explanation-modal';
import { Colors, Spacing } from '@/constants/theme';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useAskQuestion } from '@/hooks/use-ask-question';
import { useEpisodeData } from '@/hooks/use-episode-data';
import { useWakeLock } from '@/hooks/use-wake-lock';
import {
  Episode,
  Podcast,
  WordExplanation,
  fetchPodcasts,
  fetchEpisodes,
} from '@/services/api';

export default function PlayerScreen() {
  const { podcastId, episodeId, targetLanguage } = useLocalSearchParams<{
    podcastId: string;
    episodeId: string;
    targetLanguage: string;
  }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);

  const player = useAudioPlayer();
  const { segments, explanations, loading: dataLoading } = useEpisodeData(
    episodeId ?? null,
    targetLanguage ?? null,
  );
  const recorder = useAudioRecorder();
  const askQuestion = useAskQuestion();

  const [answer, setAnswer] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordExplanation | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    message: string;
    isAuth: boolean;
  } | null>(null);

  useWakeLock(player.isPlaying || recorder.isRecording);

  // Load podcast & episode metadata
  useEffect(() => {
    if (!podcastId || !episodeId) return;
    let cancelled = false;
    setMetaLoading(true);

    Promise.all([fetchPodcasts(), fetchEpisodes(podcastId)]).then(
      ([podcasts, episodes]) => {
        if (cancelled) return;
        setPodcast(podcasts.find((p) => p.id === podcastId) ?? null);
        const ep = episodes.find((e) => e.id === episodeId) ?? null;
        setEpisode(ep);
        setMetaLoading(false);
        if (ep?.audio_url) {
          player.load(ep.audio_url);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podcastId, episodeId]);

  // Ask flow
  const handleAskStart = useCallback(async () => {
    await player.pause();
    try {
      await recorder.start();
    } catch {
      setErrorModal({
        message: 'Microphone permission denied or unavailable.',
        isAuth: false,
      });
    }
  }, [player, recorder]);

  const handleAskCancel = useCallback(() => {
    recorder.cancel();
  }, [recorder]);

  const handleAskSend = useCallback(async () => {
    const uri = await recorder.stop();
    if (!uri || !episodeId || !targetLanguage) return;

    try {
      const token = await getToken();
      if (!token) {
        setErrorModal({ message: 'Unauthorized. Please sign in.', isAuth: true });
        return;
      }
      const result = await askQuestion.submit(
        token,
        episodeId,
        player.position,
        targetLanguage,
        uri,
      );
      setAnswer(result.answer);
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if (status === 401) {
        setErrorModal({ message: 'Unauthorized. Please sign in.', isAuth: true });
      } else if (status === 403) {
        setErrorModal({ message: 'No questions left.', isAuth: false });
      } else if (status) {
        setErrorModal({ message: `Request failed (${status}).`, isAuth: false });
      } else {
        setErrorModal({
          message: 'Network error while sending question.',
          isAuth: false,
        });
      }
    }
  }, [recorder, episodeId, targetLanguage, getToken, askQuestion, player.position]);

  if (metaLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.cyan} size="large" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <UserAvatar onPress={() => setDrawerVisible(true)} />
          <Pressable onPress={() => router.back()}>
            <ThemedText type="link" style={styles.backLink}>
              ← Back to episodes
            </ThemedText>
          </Pressable>
        </View>

        {podcast && (
          <ThemedText type="muted" style={styles.podcastName}>
            {podcast.title}
          </ThemedText>
        )}

        {episode && (
          <ThemedText type="title" style={styles.episodeTitle}>
            {episode.title}
          </ThemedText>
        )}

        {/* Playback Card */}
        <PlaybackCard
          isPlaying={player.isPlaying}
          isLoaded={player.isLoaded}
          position={player.position}
          duration={player.duration}
          buffered={player.buffered}
          speed={player.speed}
          speedOptions={player.speedOptions}
          audioUrl={episode?.audio_url ?? null}
          onTogglePlay={player.togglePlayPause}
          onSkip={player.skip}
          onSeek={player.seek}
          onChangeSpeed={player.changeSpeed}
        />

        {/* Ask Controls */}
        <AskControls
          isRecording={recorder.isRecording}
          isSubmitting={askQuestion.isSubmitting}
          disabled={!episodeId}
          onStart={handleAskStart}
          onCancel={handleAskCancel}
          onSend={handleAskSend}
        />

        {/* Transcript */}
        {(segments.length > 0 || dataLoading) && (
          <TranscriptPanel
            segments={segments}
            explanations={explanations}
            currentTime={player.position}
            loading={dataLoading}
            onWordPress={setSelectedWord}
          />
        )}

        {/* Answer */}
        {answer && <AnswerBlock answer={answer} />}
      </ScrollView>

      {/* Word Explanation Modal */}
      <WordExplanationModal
        word={selectedWord}
        targetLanguage={targetLanguage}
        onClose={() => setSelectedWord(null)}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={!!errorModal}
        message={errorModal?.message ?? ''}
        isAuth={errorModal?.isAuth ?? false}
        onDismiss={() => setErrorModal(null)}
        onSignIn={() => {
          setErrorModal(null);
          router.push('/sign-in');
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
    gap: Spacing.lg,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  backLink: {
    fontSize: 14,
  },
  podcastName: {
    marginTop: Spacing.sm,
  },
  episodeTitle: {
    marginBottom: Spacing.sm,
  },
});
