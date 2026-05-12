import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Switch, View } from 'react-native';
import Purchases from 'react-native-purchases';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageChoiceModal } from '@/components/language-choice-modal';
import { ThemedText } from '@/components/themed-text';
import { getDeviceLanguageCode } from '@/constants/device-locale';
import { LANGUAGES, getLanguageName } from '@/constants/languages';
import { Colors, Spacing } from '@/constants/theme';
import { useConsent } from '@/hooks/use-consent';
import { useMe } from '@/hooks/use-me';
import { updateMe } from '@/services/api';
import { setUiLanguage, SUPPORTED_UI_LANGUAGES, UiLanguage } from '@/services/i18n';

const UI_LANGUAGE_NAMES: Record<UiLanguage, string> = {
  en: 'English',
  es: 'Español',
};

const DRAWER_WIDTH = Math.round(Dimensions.get('window').width * 7 / 8);
const TIMING_CONFIG = { duration: 280 };

interface ProfileDrawerProps {
  visible: boolean;
  onClose: () => void;
}

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ProfileDrawer({ visible, onClose }: ProfileDrawerProps) {
  const { user } = useUser();
  const { getToken, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { me, loading: meLoading, refetch: refetchMe } = useMe();
  const { t, i18n } = useTranslation();

  // Freshen quota/subscription state whenever the user opens the drawer.
  useEffect(() => {
    if (visible) void refetchMe();
  }, [visible, refetchMe]);
  const [restoring, setRestoring] = useState(false);
  const [responseLangPickerVisible, setResponseLangPickerVisible] = useState(false);
  const [uiLangPickerVisible, setUiLangPickerVisible] = useState(false);
  const [savingResponseLang, setSavingResponseLang] = useState(false);
  const [savingFluent, setSavingFluent] = useState(false);
  const { accepted: analyticsAccepted, update: setAnalyticsConsent } = useConsent();

  const deviceLocale = useMemo(() => getDeviceLanguageCode(), []);
  const responseLanguage = me?.response_language ?? deviceLocale;
  const languageOptions = useMemo(() => LANGUAGES.map((l) => l.code), []);
  const uiLanguageOptions = useMemo(() => [...SUPPORTED_UI_LANGUAGES], []);
  const currentUiLanguage = (SUPPORTED_UI_LANGUAGES as readonly string[]).includes(i18n.language)
    ? (i18n.language as UiLanguage)
    : 'en';

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      await Purchases.restorePurchases();
      await refetchMe();
    } finally {
      setRestoring(false);
    }
  }, [refetchMe]);

  const handleResponseLanguageConfirm = useCallback(
    async (lang: string) => {
      setResponseLangPickerVisible(false);
      setSavingResponseLang(true);
      try {
        const jwtTemplate = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
        const token = await getToken(jwtTemplate ? { template: jwtTemplate } : undefined);
        if (!token) return;
        await updateMe(token, { response_language: lang });
        await refetchMe();
      } finally {
        setSavingResponseLang(false);
      }
    },
    [getToken, refetchMe],
  );

  const handleUiLanguageConfirm = useCallback(
    async (lang: string) => {
      setUiLangPickerVisible(false);
      if (!(SUPPORTED_UI_LANGUAGES as readonly string[]).includes(lang)) return;
      // Apply locally first for instant UI feedback; the server PATCH then
      // persists across devices. If the network call fails, we still keep the
      // local choice (next refetchMe will reconcile if needed).
      await setUiLanguage(lang as UiLanguage);
      try {
        const jwtTemplate = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
        const token = await getToken(jwtTemplate ? { template: jwtTemplate } : undefined);
        if (!token) return;
        await updateMe(token, { ui_language: lang });
        await refetchMe();
      } catch {
        // Swallow — local choice is already applied; we'll retry on next change.
      }
    },
    [getToken, refetchMe],
  );

  const handleFluentToggle = useCallback(
    async (next: boolean) => {
      setSavingFluent(true);
      try {
        const jwtTemplate = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
        const token = await getToken(jwtTemplate ? { template: jwtTemplate } : undefined);
        if (!token) return;
        await updateMe(token, { fluent_mode: next });
        await refetchMe();
      } finally {
        setSavingFluent(false);
      }
    },
    [getToken, refetchMe],
  );

  const translateX = useSharedValue(-DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(visible ? 0 : -DRAWER_WIDTH, TIMING_CONFIG);
    backdropOpacity.value = withTiming(visible ? 1 : 0, TIMING_CONFIG);
  }, [visible, translateX, backdropOpacity]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || t('profile.user');
  const email = user?.emailAddresses?.[0]?.emailAddress ?? '';

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[styles.drawer, drawerStyle, { paddingTop: insets.top + Spacing.xl }]}
      >
        {/* User info */}
        <View style={styles.userSection}>
          <ThemedText type="subtitle">{fullName}</ThemedText>
          {email ? (
            <ThemedText type="small" style={styles.email}>
              {email}
            </ThemedText>
          ) : null}
        </View>

        {/* Plan & Quota */}
        <View style={styles.quotaSection}>
          <View>
            <ThemedText type="small" style={styles.quotaLabel}>
              {t('profile.plan')}
            </ThemedText>
            {me?.is_subscribed ? (
              <View style={styles.planRow}>
                <ThemedText style={styles.planBadge}>{t('profile.planPro')}</ThemedText>
                {me.subscription_expires_at ? (
                  <ThemedText type="small" style={styles.expiryText}>
                    {me.subscription_status === 'cancelled'
                      ? t('profile.expires', { date: formatDate(me.subscription_expires_at, i18n.language) })
                      : t('profile.renews', { date: formatDate(me.subscription_expires_at, i18n.language) })}
                  </ThemedText>
                ) : null}
              </View>
            ) : (
              <ThemedText style={styles.planFree}>{t('profile.planFree')}</ThemedText>
            )}
          </View>
          <View style={styles.quotaRight}>
            <ThemedText style={styles.quotaValue}>
              {meLoading && !me ? '…' : me ? me.questions_left : '—'}
            </ThemedText>
            <ThemedText type="small" style={styles.quotaLabel}>
              {me?.is_subscribed ? t('profile.questionsLeftThisMonth') : t('profile.questionsLeft')}
            </ThemedText>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Pressable
            style={styles.menuItem}
            onPress={() => setUiLangPickerVisible(true)}
          >
            <Ionicons name="globe-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.responseLangRow}>
              <View style={styles.responseLangLabels}>
                <ThemedText style={styles.menuItemText}>{t('profile.appLanguage')}</ThemedText>
                <ThemedText type="small" style={styles.responseLangHint}>
                  {t('profile.appLanguageHint')}
                </ThemedText>
              </View>
              <ThemedText style={styles.responseLangValue}>
                {UI_LANGUAGE_NAMES[currentUiLanguage]}
              </ThemedText>
            </View>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => setResponseLangPickerVisible(true)}
            disabled={savingResponseLang}
          >
            {savingResponseLang ? (
              <ActivityIndicator size="small" color={Colors.cyan} />
            ) : (
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.textSecondary} />
            )}
            <View style={styles.responseLangRow}>
              <View style={styles.responseLangLabels}>
                <ThemedText style={styles.menuItemText}>{t('profile.responseLanguage')}</ThemedText>
                <ThemedText type="small" style={styles.responseLangHint}>
                  {t('profile.responseLanguageHint')}
                </ThemedText>
              </View>
              <ThemedText style={styles.responseLangValue}>
                {getLanguageName(responseLanguage)}
              </ThemedText>
            </View>
          </Pressable>

          <View style={styles.menuItem}>
            {savingFluent ? (
              <ActivityIndicator size="small" color={Colors.cyan} />
            ) : (
              <Ionicons name="sparkles-outline" size={20} color={Colors.textSecondary} />
            )}
            <View style={styles.fluentRow}>
              <View style={styles.fluentLabels}>
                <ThemedText style={styles.menuItemText}>{t('profile.fluentMode')}</ThemedText>
                <ThemedText type="small" style={styles.fluentHint}>
                  {t('profile.fluentModeHint')}
                </ThemedText>
              </View>
              <Switch
                value={me?.fluent_mode ?? false}
                onValueChange={handleFluentToggle}
                disabled={savingFluent || !me}
                trackColor={{ false: Colors.border, true: Colors.cyan }}
                thumbColor={Colors.white}
              />
            </View>
          </View>

          <Pressable
            style={styles.menuItem}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={Colors.cyan} />
            ) : (
              <Ionicons name="refresh-outline" size={20} color={Colors.textSecondary} />
            )}
            <ThemedText style={styles.menuItemText}>{t('profile.restorePurchases')}</ThemedText>
          </Pressable>

          <View style={styles.menuItem}>
            <Ionicons name="stats-chart-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.analyticsRow}>
              <View style={styles.analyticsLabels}>
                <ThemedText style={styles.menuItemText}>{t('profile.shareAnalytics')}</ThemedText>
                <ThemedText type="small" style={styles.analyticsHint}>
                  {t('profile.shareAnalyticsHint')}
                </ThemedText>
              </View>
              <Switch
                value={analyticsAccepted}
                onValueChange={setAnalyticsConsent}
                trackColor={{ false: Colors.border, true: Colors.cyan }}
                thumbColor={Colors.white}
              />
            </View>
          </View>
        </View>

        {/* Sign out */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Pressable
            style={styles.signOutButton}
            onPress={() => signOut()}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <ThemedText style={styles.signOutText}>{t('profile.signOut')}</ThemedText>
          </Pressable>
        </View>
      </Animated.View>

      <LanguageChoiceModal
        visible={responseLangPickerVisible}
        title={t('languagePicker.chooseAnswers')}
        options={languageOptions}
        initial={responseLanguage}
        onConfirm={handleResponseLanguageConfirm}
        onCancel={() => setResponseLangPickerVisible(false)}
      />

      <LanguageChoiceModal
        visible={uiLangPickerVisible}
        title={t('languagePicker.chooseUi')}
        options={uiLanguageOptions}
        initial={currentUiLanguage}
        onConfirm={handleUiLanguageConfirm}
        onCancel={() => setUiLangPickerVisible(false)}
        labelFn={(code) => UI_LANGUAGE_NAMES[code as UiLanguage] ?? code}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.cardSolid,
    paddingHorizontal: Spacing.xl,
  },
  userSection: {
    paddingBottom: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  email: {
    marginTop: Spacing.xs,
  },
  quotaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  quotaLabel: {
    color: Colors.textMuted,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  planBadge: {
    color: Colors.black,
    backgroundColor: Colors.cyan,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  planFree: {
    color: Colors.textSecondary,
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  expiryText: {
    color: Colors.textMuted,
  },
  quotaRight: {
    alignItems: 'flex-end',
  },
  quotaValue: {
    color: Colors.cyan,
    fontSize: 18,
    fontWeight: '600',
  },
  menuSection: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  menuItemText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  analyticsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  analyticsLabels: {
    flex: 1,
  },
  analyticsHint: {
    color: Colors.textMuted,
    marginTop: 2,
  },
  responseLangRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  responseLangLabels: {
    flex: 1,
  },
  responseLangHint: {
    color: Colors.textMuted,
    marginTop: 2,
  },
  responseLangValue: {
    color: Colors.cyan,
    fontSize: 15,
  },
  fluentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  fluentLabels: {
    flex: 1,
  },
  fluentHint: {
    color: Colors.textMuted,
    marginTop: 2,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.lg,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  signOutText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '500',
  },
});
