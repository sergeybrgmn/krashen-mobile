import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { openSupportChat } from '@/services/crisp';

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
            {t('about.back')}
          </ThemedText>
        </Pressable>

        <Markdown style={markdownStyles}>{t('about.intro')}</Markdown>

        <Pressable
          style={({ pressed }) => [styles.chatButton, pressed && styles.chatButtonPressed]}
          onPress={openSupportChat}
          accessibilityRole="button"
          accessibilityLabel={t('about.supportChatLabel')}
        >
          <ThemedText style={styles.chatButtonText}>{t('about.startChat')}</ThemedText>
        </Pressable>

        <Markdown style={markdownStyles}>{t('about.outro')}</Markdown>

        <View style={styles.legalLinks}>
          <Pressable onPress={() => router.push('/privacy')}>
            <ThemedText type="link" style={styles.legalLink}>
              {t('about.privacy')}
            </ThemedText>
          </Pressable>
          <ThemedText type="small" style={styles.legalDivider}>
            ·
          </ThemedText>
          <Pressable onPress={() => router.push('/terms')}>
            <ThemedText type="link" style={styles.legalLink}>
              {t('about.terms')}
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
