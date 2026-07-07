import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

interface Props {
  question: string;
  answer: string | null;
}

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
        <ThemedText style={styles.answer}>{answer ?? t('qa.noAnswer')}</ThemedText>
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
  answer: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
});
