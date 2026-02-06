import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';

const ABOUT_CONTENT = `# What is Lemino?

Lemino is an interactive podcast learning app. It helps you learn languages by listening to real podcast content while getting real-time support.

## How to use it

1. **Browse podcasts** — Filter by language and pick a podcast that interests you.
2. **Pick an episode** — Tap any episode to start listening.
3. **Read the transcript** — As the audio plays, the transcript updates in real-time.
4. **Tap words for explanations** — Words with a cyan underline have explanations. Tap them to see translations, grammar notes, and usage examples.
5. **Ask questions** — Tap the "Ask" button, speak your question, and get an AI-generated answer based on what you're listening to.

## Tips

- Use the **speed control** to slow down or speed up the audio.
- Use the **-15s / +15s** buttons to jump back or forward.
- Your **answer language preference** is saved so you don't have to pick it every time.
- The screen stays awake while you're listening or recording.

## Contact

Lemino is built by the Pregunta team. Visit pregunta.app for more.
`;

const markdownStyles = {
  body: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
  },
  heading1: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: 'bold' as const,
    marginBottom: 16,
    marginTop: 8,
  },
  heading2: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '600' as const,
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

        <Markdown style={markdownStyles}>{ABOUT_CONTENT}</Markdown>
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
});
