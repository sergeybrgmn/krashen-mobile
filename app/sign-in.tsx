import { useSignIn, useSignUp, useSSO } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { posthog } from '@/services/analytics';

type Mode = 'signIn' | 'signUp';

export default function SignInScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const { t } = useTranslation();
  const { reason, returnTo } = useLocalSearchParams<{ reason?: string; returnTo?: string }>();

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLoaded = signInLoaded && signUpLoaded;

  const reasonText =
    reason === 'ask'
      ? t('signIn.reasonAsk')
      : reason === 'save'
        ? t('signIn.reasonSave')
        : null;

  // Return the user to exactly where they were: an explicit returnTo wins,
  // otherwise dismiss the modal back onto the originating screen; fall back to
  // Home only when there is no back entry.
  const finishAuth = useCallback(() => {
    if (returnTo) {
      router.replace(returnTo as Href);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [returnTo, router]);

  // Cancel out of the (now optional) sign-in modal back to anonymous use:
  // dismiss onto the originating screen, or Home if there is no back entry.
  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  async function handleSignIn() {
    if (!signIn || !setSignInActive) return;
    setError('');
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        finishAuth();
      }
    } catch (e: unknown) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message;
      setError(msg ?? t('auth.signInFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (!signUp || !setSignUpActive) return;
    setError('');
    setLoading(true);
    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      });
      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        // Explicit email/password sign-up → a brand-new account. (Google SSO
        // can't be told apart from an existing-user sign-in, so we don't fire
        // signup_completed there.)
        posthog?.capture('signup_completed');
        finishAuth();
      }
    } catch (e: unknown) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message;
      setError(msg ?? t('auth.signUpFailed'));
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSignIn = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        finishAuth();
      }
    } catch (e: unknown) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message;
      setError(msg ?? t('auth.googleFailed'));
    } finally {
      setLoading(false);
    }
  }, [startSSOFlow, finishAuth, t]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Pressable
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('auth.close')}
        >
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          {mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
        </ThemedText>

        {reasonText && (
          <>
            <ThemedText style={styles.reason}>{reasonText}</ThemedText>
            <View style={styles.ladder}>
              <ThemedText style={styles.ladderItem}>{t('signIn.ladderGuest')}</ThemedText>
              <ThemedText style={styles.ladderItem}>{t('signIn.ladderFree')}</ThemedText>
              <ThemedText style={[styles.ladderItem, styles.ladderPro]}>
                {t('signIn.ladderPro')}
              </ThemedText>
            </View>
          </>
        )}

        {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

        {/* Google OAuth */}
        <Pressable
          style={[styles.googleButton, loading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.textPrimary} />
          ) : (
            <ThemedText style={styles.googleButtonText}>
              {t('auth.continueWithGoogle')}
            </ThemedText>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <ThemedText type="muted" style={styles.dividerText}>{t('auth.or')}</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        {/* Email / Password */}
        <TextInput
          style={styles.input}
          placeholder={t('auth.email')}
          placeholderTextColor={Colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <TextInput
          style={styles.input}
          placeholder={t('auth.password')}
          placeholderTextColor={Colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={mode === 'signIn' ? handleSignIn : handleSignUp}
          disabled={loading || !isLoaded}
        >
          {loading ? (
            <ActivityIndicator color={Colors.black} />
          ) : (
            <ThemedText style={styles.buttonText}>
              {mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
            </ThemedText>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
          <ThemedText type="link" style={styles.toggleText}>
            {mode === 'signIn' ? t('auth.noAccount') : t('auth.hasAccount')}
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.xxl,
    gap: Spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
    padding: Spacing.xs,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  reason: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  ladder: {
    backgroundColor: Colors.background,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  ladderItem: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  ladderPro: {
    color: Colors.cyan,
    fontWeight: '600',
  },
  error: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  googleButton: {
    backgroundColor: Colors.background,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  googleButtonText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
  },
  button: {
    backgroundColor: Colors.cyan,
    borderRadius: Radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.black,
    fontWeight: '700',
    fontSize: 16,
  },
  toggleText: {
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
