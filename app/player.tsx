import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnswerModal } from '@/components/answer-modal';
import { AskControls } from '@/components/ask-controls';
import { CoachMark, COACHMARK_STORAGE_KEY, type CoachStep } from '@/components/coach-mark';
import { ErrorModal } from '@/components/error-modal';
import { QuestionHistoryModal } from '@/components/question-history-modal';
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
import { useSavedWords } from '@/hooks/use-saved-words';
import { useWakeLock } from '@/hooks/use-wake-lock';
import {
  ApiError,
  AskResponse,
  Episode,
  Podcast,
  WordExplanation,
  fetchDemoEpisodes,
  fetchDemoPodcasts,
  fetchPodcasts,
  fetchEpisodes,
} from '@/services/api';
import { posthog } from '@/services/analytics';

const MAX_RECORDING_MS = 20_000;

export default function PlayerScreen() {
  const { podcastId, episodeId, targetLanguage: initialTargetLanguage } = useLocalSearchParams<{
    podcastId: string;
    episodeId: string;
    targetLanguage: string;
  }>();
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { t, i18n } = useTranslation();

  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [targetLanguage, setTargetLanguage] = useState<string | null>(
    initialTargetLanguage ?? null,
  );
  const [explanationPickerVisible, setExplanationPickerVisible] = useState(false);

  const player = useAudioPlayer();
  const { segments, explanations, loading: dataLoading, proRequired, refetch: refetchEpisodeData } = useEpisodeData(
    episodeId ?? null,
    targetLanguage,
  );
  const [pendingRecordingUri, setPendingRecordingUri] = useState<string | null>(null);
  const recorder = useAudioRecorder({
    maxDurationMs: MAX_RECORDING_MS,
    onLimitReached: (uri) => {
      if (uri) setPendingRecordingUri(uri);
    },
  });
  const askQuestion = useAskQuestion();
  const { me, refetch: refetchMe } = useMe();
  const { saveExplanationLanguage } = useExplanationLanguage();
  const presentPaywall = usePaywall();
  const {
    savedByKey,
    save: saveWordToVocab,
    remove: removeWordFromVocab,
    pending: savePending,
  } = useSavedWords(episodeId, targetLanguage ?? undefined);

  const [askResult, setAskResult] = useState<AskResponse | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState<
    { word: WordExplanation; segmentIndex: number } | null
  >(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    message: string;
    isAuth: boolean;
  } | null>(null);
  // Guest tapped save → show the inline PRO/sign-up prompt inside the word modal.
  const [guestSavePromptVisible, setGuestSavePromptVisible] = useState(false);
  const [coachVisible, setCoachVisible] = useState(false);

  // Coachmark targets, measured on the player.
  const transcriptRef = useRef<View | null>(null);
  const askRef = useRef<View | null>(null);

  useWakeLock(player.isPlaying || recorder.isRecording);

  // Preserve where the guest is so they return to this exact episode after
  // signing in from a gate.
  const buildReturnTo = useCallback((): string => {
    const parts: string[] = [];
    if (podcastId) parts.push(`podcastId=${encodeURIComponent(podcastId)}`);
    if (episodeId) parts.push(`episodeId=${encodeURIComponent(episodeId)}`);
    const lang = targetLanguage ?? '';
    if (lang) parts.push(`targetLanguage=${encodeURIComponent(lang)}`);
    return `/player${parts.length > 0 ? `?${parts.join('&')}` : ''}`;
  }, [podcastId, episodeId, targetLanguage]);

  const deviceLocale = useMemo(() => getDeviceLanguageCode(), []);
  const responseLanguage = me?.response_language ?? deviceLocale;

  const explanationOptions = episode?.explanation_languages ?? [];
  const canChangeExplanation = explanationOptions.length > 1;

  // Load podcast & episode metadata
  useEffect(() => {
    if (!podcastId || !episodeId) return;
    let cancelled = false;
    setMetaLoading(true);

    (async () => {
      // Signed in → authed metadata; signed out → the public demo metadata so
      // guests can browse/listen with no account and no wall.
      let podcasts: Podcast[];
      let episodes: Episode[];
      if (isSignedIn) {
        const jwtTemplate = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
        const token = await getToken(jwtTemplate ? { template: jwtTemplate } : undefined);
        if (!token) {
          if (!cancelled) setMetaLoading(false);
          return;
        }
        [podcasts, episodes] = await Promise.all([
          fetchPodcasts(token),
          fetchEpisodes(token, podcastId),
        ]);
      } else {
        [podcasts, episodes] = await Promise.all([
          fetchDemoPodcasts(),
          fetchDemoEpisodes(podcastId),
        ]);
      }
      if (cancelled) return;
      setPodcast(podcasts.find((p) => p.id === podcastId) ?? null);
      const ep = episodes.find((e) => e.id === episodeId) ?? null;
      setEpisode(ep);
      setMetaLoading(false);
      if (!isSignedIn) {
        posthog?.capture('demo_episode_opened', { episode_id: episodeId });
      }
      if (ep?.audio_url) {
        player.load(ep.audio_url);
        posthog?.capture('episode_started', {
          episode_id: episodeId,
          podcast_id: podcastId,
          target_language: targetLanguage,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podcastId, episodeId, isSignedIn]);

  // Pro-required episode: present paywall. On purchase, refresh /me so future
  // fetches see the new subscription state, and retry the data fetch.
  useEffect(() => {
    // Guests never hit proRequired (demo episodes resolve normally); the paywall
    // must never be presented while signed out.
    if (!proRequired || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      const purchased = await presentPaywall();
      if (cancelled) return;
      if (purchased) {
        await refetchMe();
        refetchEpisodeData();
      } else {
        router.back();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proRequired, isSignedIn, presentPaywall, refetchMe, refetchEpisodeData, router]);

  // Coachmark: first time a guest opens a demo episode, teach the two gestures.
  // Gated once-only by AsyncStorage; shown after metadata resolves so targets
  // are laid out and measurable.
  useEffect(() => {
    if (isSignedIn || metaLoading) return;
    let cancelled = false;
    AsyncStorage.getItem(COACHMARK_STORAGE_KEY).then((seen) => {
      if (!cancelled && !seen) setCoachVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, metaLoading]);

  const coachSteps = useMemo<CoachStep[]>(
    () => [
      { targetRef: transcriptRef, caption: t('coach.tapWord') },
      { targetRef: askRef, caption: t('coach.askQuestion') },
    ],
    [t],
  );

  const handleWordPress = useCallback((word: WordExplanation, segmentIndex: number) => {
    setSelectedWord({ word, segmentIndex });
    setGuestSavePromptVisible(false);
    posthog?.capture('word_tapped', {
      word: word.surface,
      episode_id: episodeId,
      target_language: targetLanguage,
    });
    // Funnel step: fires for guests too (demo explanations resolve normally).
    posthog?.capture('word_explanation_viewed', { target_language: targetLanguage });
  }, [episodeId, targetLanguage]);

  const handleCloseWord = useCallback(() => {
    setSelectedWord(null);
    setGuestSavePromptVisible(false);
  }, []);

  // Guest chose to sign up from the save prompt → contextual sign-in (save).
  const handleGuestSaveCta = useCallback(() => {
    posthog?.capture('signup_started', { trigger: 'save' });
    setGuestSavePromptVisible(false);
    setSelectedWord(null);
    router.push({
      pathname: '/sign-in',
      params: { reason: 'save', returnTo: buildReturnTo() },
    });
  }, [router, buildReturnTo]);

  // Save/unsave the word currently open in the modal. Unsaving is free; saving
  // requires PRO — gate on the known /me state, and (edge) retry after the
  // paywall if the backend still answers pro_required against a stale /me.
  const handleToggleSave = useCallback(async () => {
    if (!selectedWord) return;
    const { word, segmentIndex } = selectedWord;

    // Guest: staged toward signup, never the paywall. Show the PRO-feature
    // message inline; the CTA routes to contextual sign-in (reason=save).
    if (!isSignedIn) {
      posthog?.capture('save_gate_shown_guest', {
        episode_id: episodeId,
        target_language: targetLanguage,
      });
      setGuestSavePromptVisible(true);
      return;
    }

    const key = `${segmentIndex}:${word.start_char}`;
    const existing = savedByKey.get(key);

    const captureSaved = () =>
      posthog?.capture('word_saved', {
        word: word.surface,
        episode_id: episodeId,
        target_language: targetLanguage,
      });

    if (existing) {
      try {
        await removeWordFromVocab(existing);
        posthog?.capture('word_unsaved', {
          word: word.surface,
          episode_id: episodeId,
          target_language: targetLanguage,
        });
      } catch {
        // use-saved-words already logged; nothing else to do.
      }
      return;
    }

    if (!me?.is_subscribed) {
      const purchased = await presentPaywall();
      if (!purchased) return;
      await refetchMe();
    }

    try {
      await saveWordToVocab(segmentIndex, word.start_char);
      captureSaved();
    } catch (e) {
      const apiErr = e as ApiError;
      // Stale /me: backend rejected with pro_required. Offer the paywall, then
      // retry the save once on purchase.
      if (apiErr.status === 403 && apiErr.detail?.code === 'pro_required') {
        const purchased = await presentPaywall();
        if (!purchased) return;
        await refetchMe();
        try {
          await saveWordToVocab(segmentIndex, word.start_char);
          captureSaved();
        } catch {
          // give up; already logged.
        }
      }
      // Other errors (e.g. saved_words_limit_reached) already logged by the hook.
    }
  }, [
    selectedWord,
    isSignedIn,
    savedByKey,
    removeWordFromVocab,
    me,
    presentPaywall,
    refetchMe,
    saveWordToVocab,
    episodeId,
    targetLanguage,
  ]);

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
    // Guest: don't record. Route to contextual sign-in (reason=ask); after
    // signing up they land back here with 3 free questions ready to spend.
    if (!isSignedIn) {
      posthog?.capture('ask_gate_shown_guest', { episode_id: episodeId });
      posthog?.capture('signup_started', { trigger: 'ask' });
      router.push({
        pathname: '/sign-in',
        params: { reason: 'ask', returnTo: buildReturnTo() },
      });
      return;
    }

    // Signed-in free user at 0 questions → paywall (backend owns the quota).
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
        message: t('errors.micPermission'),
        isAuth: false,
      });
    }
  }, [isSignedIn, episodeId, router, buildReturnTo, me, player, recorder, presentPaywall, refetchMe, t]);

  const handleAskCancel = useCallback(() => {
    recorder.cancel();
  }, [recorder]);

  const submitRecording = useCallback(async (uri: string) => {
    if (!episodeId) return;
    try {
      const jwtTemplate = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
      const token = await getToken(jwtTemplate ? { template: jwtTemplate } : undefined);
      if (!token) {
        setErrorModal({ message: t('errors.unauthorized'), isAuth: true });
        return;
      }
      const result = await askQuestion.submit(
        token,
        episodeId,
        player.position,
        responseLanguage,
        uri,
      );
      setAskResult(result);
      // Refresh quota so the gate in handleAskStart stays current.
      void refetchMe();
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      const detail = (e as { detail?: { code?: string; message?: string; reset_at?: string } }).detail;
      if (status === 401) {
        setErrorModal({ message: t('errors.unauthorized'), isAuth: true });
      } else if (status === 403 && detail?.code === 'pro_weekly_limit_reached') {
        // Pro user hit the weekly cap. Show informational message with reset date.
        const resetDate = detail.reset_at
          ? new Date(detail.reset_at).toLocaleDateString(i18n.language, {
              month: 'short', day: 'numeric',
            })
          : '';
        setErrorModal({
          message: resetDate
            ? t('errors.weeklyLimitResets', { date: resetDate })
            : t('errors.weeklyLimit'),
          isAuth: false,
        });
      } else if (status === 403) {
        // Free tier exhausted. Present paywall so user can upgrade.
        const purchased = await presentPaywall();
        if (purchased) {
          await refetchMe();
        }
      } else if (status) {
        setErrorModal({ message: t('errors.requestFailed', { status }), isAuth: false });
      } else {
        setErrorModal({
          message: t('errors.network'),
          isAuth: false,
        });
      }
    }
  }, [episodeId, getToken, askQuestion, player.position, responseLanguage, presentPaywall, refetchMe, t, i18n.language]);

  const handleAskSend = useCallback(async () => {
    const uri = await recorder.stop();
    if (!uri) return;
    await submitRecording(uri);
  }, [recorder, submitRecording]);

  const handleConfirmSend = useCallback(async () => {
    if (!pendingRecordingUri) return;
    const uri = pendingRecordingUri;
    setPendingRecordingUri(null);
    await submitRecording(uri);
  }, [pendingRecordingUri, submitRecording]);

  const handleRedo = useCallback(async () => {
    setPendingRecordingUri(null);
    await handleAskStart();
  }, [handleAskStart]);

  const handleShowHistory = useCallback(() => {
    setHistoryVisible(true);
    posthog?.capture('qa_history_opened', {
      episode_id: episodeId,
      podcast_id: podcastId,
    });
  }, [episodeId, podcastId]);

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
              {t('player.backToEpisodes')}
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
          onShowHistory={handleShowHistory}
        />

        {/* Ask Controls */}
        <View ref={askRef} collapsable={false}>
          <AskControls
            isRecording={recorder.isRecording}
            isSubmitting={askQuestion.isSubmitting}
            awaitingConfirmation={!!pendingRecordingUri}
            disabled={!episodeId}
            elapsedMs={recorder.elapsedMs}
            maxDurationMs={MAX_RECORDING_MS}
            onStart={handleAskStart}
            onCancel={handleAskCancel}
            onSend={handleAskSend}
            onRedo={handleRedo}
            onConfirmSend={handleConfirmSend}
          />
          {!isSignedIn && !recorder.isRecording && !pendingRecordingUri && (
            <ThemedText style={styles.askGuestPrompt}>
              {t('player.askGuestPrompt')}
            </ThemedText>
          )}
        </View>

        {/* Explanation language chip — only when the user has a real choice */}
        {targetLanguage && canChangeExplanation && (
          <View style={styles.chipRow}>
            <Pressable
              style={styles.chip}
              onPress={() => setExplanationPickerVisible(true)}
            >
              <Ionicons name="language-outline" size={14} color={Colors.textSecondary} />
              <ThemedText style={styles.chipText}>
                {t('player.explanationsChip', { language: getLanguageName(targetLanguage) })}
              </ThemedText>
              <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
            </Pressable>
          </View>
        )}

        {/* Transcript */}
        {(segments.length > 0 || dataLoading) && (
          <View ref={transcriptRef} collapsable={false}>
            <TranscriptPanel
              segments={segments}
              explanations={explanations}
              currentTime={player.position}
              loading={dataLoading}
              onWordPress={handleWordPress}
            />
          </View>
        )}
      </ScrollView>

      {/* Fresh answer to a just-asked question */}
      <AnswerModal result={askResult} onClose={() => setAskResult(null)} />

      {/* Q&A history for this episode */}
      <QuestionHistoryModal
        visible={historyVisible}
        episodeId={episodeId ?? null}
        onClose={() => setHistoryVisible(false)}
      />

      {/* Word Explanation Modal */}
      <WordExplanationModal
        word={selectedWord?.word ?? null}
        targetLanguage={targetLanguage ?? undefined}
        onClose={handleCloseWord}
        isSaved={
          selectedWord
            ? savedByKey.has(`${selectedWord.segmentIndex}:${selectedWord.word.start_char}`)
            : false
        }
        onToggleSave={handleToggleSave}
        savePending={savePending}
        guestSaveMessage={guestSavePromptVisible ? t('wordModal.guestSavePrompt') : null}
        onGuestSaveCta={handleGuestSaveCta}
      />

      {/* Explanation Language Picker */}
      <LanguageChoiceModal
        visible={explanationPickerVisible}
        title={t('languagePicker.chooseExplanations')}
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

      {/* First-run coachmark (guests only, once) */}
      {coachVisible && (
        <CoachMark steps={coachSteps} onDismiss={() => setCoachVisible(false)} />
      )}
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
  askGuestPrompt: {
    marginTop: Spacing.md,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
