import { useSignIn, useSignInWithApple, useSignUp, useSSO } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
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

/** Which flow is waiting on an emailed code. The Clerk call needed to finish
 * differs between them, so the pending flow has to be remembered. */
type PendingCode = 'signUp' | 'secondFactor';

export default function SignInScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const router = useRouter();
  const { t } = useTranslation();
  const { reason, returnTo } = useLocalSearchParams<{ reason?: string; returnTo?: string }>();

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingCode, setPendingCode] = useState<PendingCode | null>(null);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');

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

  // Clerk signals failure two different ways, and both have to reach the user.
  // A rejected promise is the obvious one (unknown account, wrong password). The
  // easy one to miss is a *resolved* attempt whose status isn't `complete`: that
  // means Clerk wants a further step this screen doesn't implement (email code,
  // 2FA). Leaving that case unhandled makes the button do nothing at all, which
  // reads as a broken app rather than a rejected credential.
  async function handleSignIn() {
    if (!signIn || !setSignInActive) {
      setError(t('auth.notReady'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        finishAuth();
      } else if (result.status === 'needs_second_factor') {
        // The password was accepted; the instance additionally wants an emailed
        // code. Ask Clerk to send it, then swap the form for the code entry.
        const hasEmailCode = result.supportedSecondFactors?.some(
          (factor) => factor.strategy === 'email_code',
        );
        if (!hasEmailCode) {
          console.warn(
            'Sign in needs a second factor we cannot collect',
            result.supportedSecondFactors?.map((f) => f.strategy),
          );
          setError(t('auth.signInIncomplete'));
          return;
        }
        // Omitting emailAddressId lets Clerk use the primary address.
        await signIn.prepareSecondFactor({ strategy: 'email_code' });
        setPendingCode('secondFactor');
      } else {
        console.warn('Sign in returned an unhandled status', result.status);
        setError(t('auth.signInIncomplete'));
      }
    } catch (e: unknown) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message;
      console.warn('Sign in failed', e);
      setError(msg ?? t('auth.signInFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (!signUp || !setSignUpActive) {
      setError(t('auth.notReady'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        // The instance has legal consent enabled, so without this the sign-up
        // stays `missing_requirements` forever — the emailed code verifies, and
        // then nothing can complete it. The consent line below the form is what
        // makes asserting this honest.
        legalAccepted: true,
      });
      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        // Explicit email/password sign-up → a brand-new account. (Google SSO
        // can't be told apart from an existing-user sign-in, so we don't fire
        // signup_completed there.)
        posthog?.capture('signup_completed');
        finishAuth();
      } else if (result.status === 'missing_requirements') {
        // "Verify at sign-up" is enabled, so Clerk won't create the session until
        // the address is confirmed.
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPendingCode('signUp');
      } else {
        console.warn(
          'Sign up returned an unhandled status',
          result.status,
          'missing:', result.missingFields,
        );
        setError(t('auth.signUpIncomplete'));
      }
    } catch (e: unknown) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message;
      console.warn('Sign up failed', e);
      setError(msg ?? t('auth.signUpFailed'));
    } finally {
      setLoading(false);
    }
  }

  // Finish whichever flow is waiting on the emailed code. Sign-up confirms the
  // address; sign-in satisfies the second factor. Both end in a live session.
  const handleSubmitCode = useCallback(async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (pendingCode === 'signUp') {
        if (!signUp || !setSignUpActive) return;
        const result = await signUp.attemptEmailAddressVerification({ code });
        if (result.status === 'complete') {
          await setSignUpActive({ session: result.createdSessionId });
          posthog?.capture('signup_completed');
          finishAuth();
          return;
        }
        // Verified the address but something else is outstanding. Log exactly
        // what, so this is diagnosable instead of a mystery.
        console.warn(
          'Sign up verification returned',
          result.status,
          'missing:', result.missingFields,
          'unverified:', result.unverifiedFields,
        );
        setError(t('auth.signUpIncomplete'));
      } else {
        if (!signIn || !setSignInActive) return;
        const result = await signIn.attemptSecondFactor({ strategy: 'email_code', code });
        if (result.status === 'complete') {
          await setSignInActive({ session: result.createdSessionId });
          finishAuth();
          return;
        }
        console.warn('Second factor returned', result.status);
        setError(t('auth.signInIncomplete'));
      }
    } catch (e: unknown) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message;
      console.warn('Code verification failed', e);
      setError(msg ?? t('auth.codeInvalid'));
    } finally {
      setLoading(false);
    }
  }, [pendingCode, code, signUp, setSignUpActive, signIn, setSignInActive, finishAuth, t]);

  const handleResendCode = useCallback(async () => {
    setError('');
    setNotice('');
    setCode('');
    setLoading(true);
    try {
      if (pendingCode === 'signUp') {
        await signUp?.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else {
        await signIn?.prepareSecondFactor({ strategy: 'email_code' });
      }
      setNotice(t('auth.codeResent'));
    } catch (e: unknown) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message;
      console.warn('Resending the code failed', e);
      setError(msg ?? t('auth.codeResendFailed'));
    } finally {
      setLoading(false);
    }
  }, [pendingCode, signUp, signIn, t]);

  // Abandon code entry and go back to the credentials form. The Clerk attempt is
  // left as-is; re-submitting the form starts a fresh one.
  const handleCancelCode = useCallback(() => {
    setPendingCode(null);
    setCode('');
    setError('');
    setNotice('');
  }, []);

  // Sign in with Apple. The hook exchanges the native Apple ID token with Clerk
  // and handles the sign-in vs. sign-up transfer itself, so one call covers both
  // a returning user and a first-time one.
  const handleAppleSignIn = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { createdSessionId, setActive, signUp: appleSignUp } =
        await startAppleAuthenticationFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        finishAuth();
      } else {
        // No session and no throw means Clerk wants something more before it will
        // issue one — most likely a brand-new account still missing a required
        // field. Report it rather than leaving the button apparently dead.
        console.warn('Apple sign-in produced no session', {
          signUpStatus: appleSignUp?.status,
          missingFields: appleSignUp?.missingFields,
          unverifiedFields: appleSignUp?.unverifiedFields,
        });
        setError(t('auth.appleFailed'));
      }
    } catch (e: unknown) {
      // Backing out of the native sheet is a normal choice, not an error to report.
      if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message;
      setError(msg ?? t('auth.appleFailed'));
    } finally {
      setLoading(false);
    }
  }, [startAppleAuthenticationFlow, finishAuth, t]);

  const handleGoogleSignIn = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { createdSessionId, setActive, signUp: googleSignUp } = await startSSOFlow({
        strategy: 'oauth_google',
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        finishAuth();
      } else {
        console.warn('Google sign-in produced no session', {
          signUpStatus: googleSignUp?.status,
          missingFields: googleSignUp?.missingFields,
          unverifiedFields: googleSignUp?.unverifiedFields,
        });
        setError(t('auth.googleFailed'));
      }
    } catch (e: unknown) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message;
      console.warn('Google sign-in failed', e);
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
          {pendingCode
            ? t('auth.verifyTitle')
            : mode === 'signIn'
              ? t('auth.signIn')
              : t('auth.signUp')}
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
        {!!notice && <ThemedText style={styles.notice}>{notice}</ThemedText>}

        {pendingCode ? (
          /* Emailed-code step. Reached when the instance requires verification at
             sign-up, or an email code as a second factor at sign-in. Replaces the
             form rather than appending to it, so there is one obvious action. */
          <>
            <ThemedText style={styles.reason}>
              {t('auth.verifyPrompt', { email })}
            </ThemedText>

            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder={t('auth.code')}
              placeholderTextColor={Colors.textMuted}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={6}
              autoFocus
            />

            <Pressable
              style={[styles.button, (loading || code.length < 6) && styles.buttonDisabled]}
              onPress={handleSubmitCode}
              disabled={loading || code.length < 6}
            >
              {loading ? (
                <ActivityIndicator color={Colors.black} />
              ) : (
                <ThemedText style={styles.buttonText}>{t('auth.verify')}</ThemedText>
              )}
            </Pressable>

            <Pressable onPress={handleResendCode} disabled={loading}>
              <ThemedText type="link" style={styles.toggleText}>
                {t('auth.resendCode')}
              </ThemedText>
            </Pressable>

            <Pressable onPress={handleCancelCode} disabled={loading}>
              <ThemedText type="muted" style={styles.toggleText}>
                {t('common.back')}
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            {/* Sign in with Apple — guideline 4.8 wants a privacy-preserving option
                alongside Google, and listed first so it isn't the lesser choice.
                Rendered with Apple's own component so the mark, wording and
                localization follow the HIG. iOS-only: there is no native sheet
                elsewhere, and other platforms still have Google + email. */}
            {Platform.OS === 'ios' && (
              <View
                pointerEvents={loading ? 'none' : 'auto'}
                style={loading ? styles.buttonDisabled : undefined}
              >
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={25}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              </View>
            )}

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

            {/* Reveal toggle: this password is typed by hand on a phone keyboard,
                where a silent typo is indistinguishable from a wrong password. */}
            <View style={styles.passwordField}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder={t('auth.password')}
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                textContentType="password"
              />
              <Pressable
                style={styles.passwordReveal}
                onPress={() => setPasswordVisible((v) => !v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t(
                  passwordVisible ? 'auth.hidePassword' : 'auth.showPassword',
                )}
              >
                <Ionicons
                  name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>

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

            {/* Legal consent. Shown for every method, not just sign-up, because
                Apple and Google create accounts too — and it is what makes
                sending `legalAccepted: true` an honest claim rather than an
                assertion the user was never shown. */}
            <View style={styles.consentRow}>
              <ThemedText type="muted" style={styles.consentText}>
                {t('auth.consentText')}{' '}
              </ThemedText>
              <Pressable onPress={() => router.push('/terms')} hitSlop={8}>
                <ThemedText style={[styles.consentText, styles.consentLink]}>
                  {t('about.terms')}
                </ThemedText>
              </Pressable>
              <ThemedText type="muted" style={styles.consentText}>
                {' '}{t('auth.consentAnd')}{' '}
              </ThemedText>
              <Pressable onPress={() => router.push('/privacy')} hitSlop={8}>
                <ThemedText style={[styles.consentText, styles.consentLink]}>
                  {t('about.privacy')}
                </ThemedText>
              </Pressable>
            </View>
          </>
        )}
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
  notice: {
    color: Colors.cyan,
    fontSize: 14,
    textAlign: 'center',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  consentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  consentText: {
    fontSize: 12,
    lineHeight: 18,
  },
  consentLink: {
    color: Colors.cyan,
  },
  passwordField: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    // Room for the reveal button so long passphrases don't run under it.
    paddingRight: 48,
  },
  passwordReveal: {
    position: 'absolute',
    right: Spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
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
    // Stated explicitly, not left to defaults: `codeInput` overrides both, and
    // React reuses this TextInput across the two branches of the pendingCode
    // ternary. RN only diffs style keys it can see, so a value that is merely
    // absent here would not reset — the email field would keep the code field's
    // letter spacing after tapping Back.
    textAlign: 'left',
    letterSpacing: 0,
  },
  appleButton: {
    width: '100%',
    // Matches the Google button's rendered height (14pt padding + 16pt text).
    height: 50,
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
