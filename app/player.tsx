import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { LanguageChoiceModal } from '@/components/language-choice-modal';
import { PlaybackCard } from '@/components/playback-card';
import { ProfileDrawer } from '@/components/profile-drawer';
import { ThemedText } from '@/components/themed-text';
import { TranscriptPanel } from '@/components/transcript-panel';
import { UserAvatar } from '@/components/user-avatar';
import { WordExplanationModal } from '@/components/word-explanation-modal';
import { getDeviceLanguageCode } from '@/constants/device-locale';
import { getLanguageName } from '@/constants/languages';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useAskQuestion } from '@/hooks/use-ask-question';
import { useEpisodeData } from '@/hooks/use-episode-data';
import { useExplanationLanguage } from '@/hooks/use-explanation-language';
import { useMe } from '@/hooks/use-me';
import { usePaywall } from '@/hooks/use-paywall';
import { useWakeLock } from '@/hooks/use-wake-lock';
import {
  Episode,
  Podcast,
  WordExplanation,
  fetchPodcasts,
  fetchEpisodes,
} from '@/services/api';
import { posthog } from '@/services/analytics';

export default function PlayerScreen() {
  const { podcastId, episodeId, targetLanguage: initialTargetLanguage } = useLocalSearchParams<{
    podcastId: string;
    episodeId: string;
    targetLanguage: string;
  }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [targetLanguage, setTargetLanguage] = useState<string | null>(
    initialTargetLanguage ?? null,
  );
  const [explanationPickerVisible, setExplanationPickerVisible] = useState(false);

  const player = useAudioPlayer();
  const { segments, explanations, loading: dataLoading } = useEpisodeData(
    episodeId ?? null,
    targetLanguage,
  );
  const recorder = useAudioRecorder();
  const askQuestion = useAskQuestion();
  const { me, refetch: refetchMe } = useMe();
  const { saveExplanationLanguage } = useExplanationLanguage();
  const presentPaywall = usePaywall();

  const [answer, setAnswer] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordExplanation | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    message: string;
    isAuth: boolean;
  } | null>(null);

  useWakeLock(player.isPlaying || recorder.isRecording);

  const deviceLocale = useMemo(() => getDeviceLanguageCode(), []);
  const responseLanguage = me?.response_language ?? deviceLocale;

  const explanationOptions = episode?.explanation_languages ?? [];
  const canChangeExplanation = explanationOptions.length > 1;

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
          posthog?.capture('episode_started', {
            episode_id: episodeId,
            podcast_id: podcastId,
            target_language: targetLanguage,
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podcastId, episodeId]);

  const handleWordPress = useCallback((word: WordExplanation) => {
    setSelectedWord(word);
    posthog?.capture('word_tapped', {
      word: word.surface,
      episode_id: episodeId,
      target_language: targetLanguage,
    });
  }, [episodeId, targetLanguage]);

  const handleExplanationConfirm = useCallback(
    async (lang: string) => {
      await saveExplanationLanguage(lang);
      setTargetLanguage(lang);
      setExplanationPickerVisible(false);
    },
    [saveExplanationLanguage],
  );

  // Ask flow — gate on subscription/quota before recording.
  const handleAskStart = useCallback(async () => {
    if (!me?.is_subscribed && (me?.questions_left ?? 0) <= 0) {
      const purchased = await presentPaywall();
      if (!purchased) return;
      // Webhook may need a moment to reach the backend.
      // Refetch /api/me to pull fresh subscription state.
      await refetchMe();
    }

    await player.pause();
    try {
      await recorder.start();
    } catch {
      setErrorModal({
        message: 'Microphone permission denied or unavailable.',
        isAuth: false,
      });
    }
  }, [me, player, recorder, presentPaywall, refetchMe]);

  const handleAskCancel = useCallback(() => {
    recorder.cancel();
  }, [recorder]);

  const handleAskSend = useCallback(async () => {
    const uri = await recorder.stop();
    if (!uri || !episodeId) return;

    try {
      const jwtTemplate = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
      const token = await getToken(jwtTemplate ? { template: jwtTemplate } : undefined);
      if (!token) {
        setErrorModal({ message: 'Unauthorized. Please sign in.', isAuth: true });
        return;
      }
      const result = await askQuestion.submit(
        token,
        episodeId,
        player.position,
        responseLanguage,
        uri,
      );
      setAnswer(result.answer);
      // Refresh quota so the gate in handleAskStart stays current.
      void refetchMe();
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      const detail = (e as { detail?: { code?: string; message?: string; reset_at?: string } }).detail;
      if (status === 401) {
        setErrorModal({ message: 'Unauthorized. Please sign in.', isAuth: true });
      } else if (status === 403 && detail?.code === 'pro_monthly_limit_reached') {
        // Pro user hit the monthly cap. Show informational message with reset date.
        const resetDate = detail.reset_at
          ? new Date(detail.reset_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric',
            })
          : '';
        setErrorModal({
          message: `Monthly question limit reached.${resetDate ? ` Resets ${resetDate}.` : ''}`,
          isAuth: false,
        });
      } else if (status === 403) {
        // Free tier exhausted. Present paywall so user can upgrade.
        const purchased = await presentPaywall();
        if (purchased) {
          await refetchMe();
        }
      } else if (status) {
        setErrorModal({ message: `Request failed (${status}).`, isAuth: false });
      } else {
        setErrorModal({
          message: 'Network error while sending question.',
          isAuth: false,
        });
      }
    }
  }, [recorder, episodeId, getToken, askQuestion, player.position, responseLanguage, presentPaywall, refetchMe]);

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

        {/* Explanation language chip — only when the user has a real choice */}
        {targetLanguage && canChangeExplanation && (
          <View style={styles.chipRow}>
            <Pressable
              style={styles.chip}
              onPress={() => setExplanationPickerVisible(true)}
            >
              <Ionicons name="language-outline" size={14} color={Colors.textSecondary} />
              <ThemedText style={styles.chipText}>
                Explanations: {getLanguageName(targetLanguage)}
              </ThemedText>
              <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
            </Pressable>
          </View>
        )}

        {/* Transcript */}
        {(segments.length > 0 || dataLoading) && (
          <TranscriptPanel
            segments={segments}
            explanations={explanations}
            currentTime={player.position}
            loading={dataLoading}
            onWordPress={handleWordPress}
          />
        )}

        {/* Answer */}
        {answer && <AnswerBlock answer={answer} />}
      </ScrollView>

      {/* Word Explanation Modal */}
      <WordExplanationModal
        word={selectedWord}
        targetLanguage={targetLanguage ?? undefined}
        onClose={() => setSelectedWord(null)}
      />

      {/* Explanation Language Picker */}
      <LanguageChoiceModal
        visible={explanationPickerVisible}
        title="Choose the language for explanations"
        options={explanationOptions}
        initial={targetLanguage}
        onConfirm={handleExplanationConfirm}
        onCancel={() => setExplanationPickerVisible(false)}
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
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
