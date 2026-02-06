import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

type Mode = 'signIn' | 'signUp';

export default function SignInScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLoaded = signInLoaded && signUpLoaded;

  async function handleSignIn() {
    if (!signIn || !setSignInActive) return;
    setError('');
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        router.replace('/');
      }
    } catch (e: unknown) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message;
      setError(msg ?? 'Sign in failed.');
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
        router.replace('/');
      }
    } catch (e: unknown) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message;
      setError(msg ?? 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          {mode === 'signIn' ? 'Sign In' : 'Sign Up'}
        </ThemedText>

        {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
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
              {mode === 'signIn' ? 'Sign In' : 'Sign Up'}
            </ThemedText>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
          <ThemedText type="link" style={styles.toggleText}>
            {mode === 'signIn'
              ? "Don't have an account? Sign Up"
              : 'Already have an account? Sign In'}
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
  title: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
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
