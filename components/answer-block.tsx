import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';

interface Props {
  answer: string;
}

export function AnswerBlock({ answer }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>{t('answer.label')}</ThemedText>
      <ThemedText style={styles.text}>{answer}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
});
