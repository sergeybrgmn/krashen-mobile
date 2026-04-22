import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { openSupportChat } from '@/services/crisp';

const ABOUT_INTRO = `# About Krashen

Listening to podcasts is a proven, tutor-recommended way to learn a new language — except, in practice, you end up missing words, rewinding, and guessing what was said. So it rarely works.

**Krashen** is a podcast player that fixes that. You listen to the same shows you'd find on any other podcast app, but at any moment you can pause and see the explanation and translation of any word — or ask a question about the last few seconds: clarify something you didn't catch, ask for the meaning of an idiom, or request a translation.

Nothing has to slip by anymore.

## What Krashen is not

Krashen is **not** a translation tool. We don't aim to let you listen to podcasts in your preferred language — that's simply not our mission.

We believe in consuming content in its original language.

However, we plan to add an *Explain* mode so you can ask questions even when listening for general interest, not just for language practice.

## FAQ

### Why is the podcast collection so small?

Preparing each podcast for interactive dialogue has a cost. We're focused on professional language-learning content first and plan to expand the catalog over time.

### Can I add my favorite podcast or episode?

Yes, we plan to offer all users a monthly quota to add their own podcasts.

### Why "Krashen"?

The app is named after **Stephen Krashen** ([Wikipedia](https://en.wikipedia.org/wiki/Stephen_Krashen)), a linguist known for his theory of second language acquisition. His *input hypothesis* argues that we acquire language by understanding messages slightly beyond our current level. That idea is at the heart of what we do — helping you learn by engaging with real content and asking questions as you listen.

## Get in touch

Questions, podcast suggestions, or feedback? Start a chat below, or write to us at info@krashen.app — we read every message.
`;

const ABOUT_OUTRO = `## Disclaimers

- Krashen does not store your audio recordings — only their transcriptions, used to generate personalized learning content.
- Microphone access is used only while you record a question.
- Krashen is not a replacement for professional tutoring, but a companion that makes listening practice more effective.
- While we don't promise specific learning results, we genuinely believe that interactive listening and active questioning significantly improve language comprehension and retention.
`;

const markdownStyles = {
  body: {
    ...Typography.base,
  },
  heading1: {
    ...Typography.title,
    marginBottom: 16,
    marginTop: 8,
  },
  heading2: {
    ...Typography.subtitle,
    marginBottom: 12,
    marginTop: 20,
  },
  strong: {
    color: Colors.textPrimary,
    fontWeight: '600' as const,
  },
  link: {
    color: Colors.cyan,
  },
  list_item: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
  },
  bullet_list: {
    marginBottom: 8,
  },
  ordered_list: {
    marginBottom: 8,
  },
  paragraph: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  code_inline: {
    backgroundColor: Colors.card,
    color: Colors.cyan,
    borderRadius: Radii.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontSize: 14,
  },
};

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()}>
          <ThemedText type="link" style={styles.backLink}>
            ← Back to podcasts
          </ThemedText>
        </Pressable>

        <Markdown style={markdownStyles}>{ABOUT_INTRO}</Markdown>

        <Pressable
          style={({ pressed }) => [styles.chatButton, pressed && styles.chatButtonPressed]}
          onPress={openSupportChat}
          accessibilityRole="button"
          accessibilityLabel="Start a chat with support"
        >
          <ThemedText style={styles.chatButtonText}>Start a chat</ThemedText>
        </Pressable>

        <Markdown style={markdownStyles}>{ABOUT_OUTRO}</Markdown>

        <View style={styles.legalLinks}>
          <Pressable onPress={() => router.push('/privacy')}>
            <ThemedText type="link" style={styles.legalLink}>
              Privacy Policy
            </ThemedText>
          </Pressable>
          <ThemedText type="small" style={styles.legalDivider}>
            ·
          </ThemedText>
          <Pressable onPress={() => router.push('/terms')}>
            <ThemedText type="link" style={styles.legalLink}>
              Terms of Service
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
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
  backLink: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    fontSize: 14,
  },
  chatButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.cyan,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.pill,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  chatButtonPressed: {
    opacity: 0.8,
  },
  chatButtonText: {
    color: Colors.black,
    fontSize: 15,
    fontWeight: '600',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  legalLink: {
    fontSize: 14,
  },
  legalDivider: {
    color: Colors.textMuted,
  },
});
