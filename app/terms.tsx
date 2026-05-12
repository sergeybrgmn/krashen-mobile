import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

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
  heading3: {
    color: Colors.cyan,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
    marginTop: 16,
  },
  strong: {
    color: Colors.textPrimary,
    fontWeight: '600' as const,
  },
  em: {
    color: Colors.cyan,
    fontStyle: 'italic' as const,
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

export default function TermsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()}>
          <ThemedText type="link" style={styles.backLink}>
            {t('terms.back')}
          </ThemedText>
        </Pressable>

        <Markdown style={markdownStyles}>{t('terms.content')}</Markdown>
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
