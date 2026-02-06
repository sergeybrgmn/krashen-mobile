import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { tokenCache } from '@/services/auth';

SplashScreen.preventAutoHideAsync();

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const onSignIn = segments[0] === 'sign-in';

    if (!isSignedIn && !onSignIn) {
      router.replace('/sign-in');
    } else if (isSignedIn && onSignIn) {
      router.replace('/');
    }
  }, [isSignedIn, isLoaded, segments, router]);

  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
      <ThemeProvider value={DarkTheme}>
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#000000' },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="player" />
            <Stack.Screen name="about" />
            <Stack.Screen name="sign-in" />
          </Stack>
        </AuthGate>
        <StatusBar style="light" />
      </ThemeProvider>
    </ClerkProvider>
  );
}
