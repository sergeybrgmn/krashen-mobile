import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';

interface Props {
  question: string;
  answer: string | null;
}

/** The model answers in Markdown — nothing in `build_response_prompt` asks it
 * to, that is just the default output style — so bold, italics and lists have
 * to be rendered rather than printed. Plain <Text> showed the literal `**`
 * around every emphasis.
 *
 * Every element needs an explicit `color`: the library styles each one
 * separately, and anything left unset falls back to RN's default black, which
 * is invisible on the dark card. Body sizes mirror the old `answer` style so
 * the layout is unchanged; headings are deliberately modest, since a `###` in
 * a 400-token answer is a paragraph label, not a page title. */
const answerMarkdownStyles = {
  body: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
  },
  paragraph: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 0,
    marginBottom: 12,
  },
  strong: {
    color: Colors.textPrimary,
    fontWeight: '600' as const,
  },
  em: {
    color: Colors.textPrimary,
    fontStyle: 'italic' as const,
  },
  heading1: {
    color: Colors.textPrimary,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  heading2: {
    color: Colors.textPrimary,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  heading3: {
    color: Colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
    marginBottom: 4,
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
  blockquote: {
    backgroundColor: 'transparent',
    borderLeftColor: Colors.border,
    borderLeftWidth: 3,
    color: Colors.textMuted,
    marginLeft: 0,
    paddingHorizontal: Spacing.sm,
  },
  link: {
    color: Colors.cyan,
  },
  hr: {
    backgroundColor: Colors.border,
    height: 1,
  },
  code_inline: {
    backgroundColor: Colors.card,
    color: Colors.cyan,
    borderRadius: Radii.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontSize: 14,
  },
  code_block: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  fence: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
};

/** Labeled question + answer text, shared by the fresh-answer modal and the
 * history detail view. */
export function QAFields({ question, answer }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <View>
        <ThemedText style={styles.label}>{t('qa.question')}</ThemedText>
        <ThemedText style={styles.question}>{question}</ThemedText>
      </View>
      <View>
        <ThemedText style={styles.label}>{t('qa.answer')}</ThemedText>
        <Markdown style={answerMarkdownStyles}>{answer ?? t('qa.noAnswer')}</Markdown>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  question: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.cyan,
    fontStyle: 'italic',
  },
});
