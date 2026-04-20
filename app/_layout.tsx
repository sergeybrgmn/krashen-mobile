import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { tokenCache } from '@/services/auth';
import { configurePurchases, identifyUser, resetUser } from '@/services/purchases';
import { configureAnalytics, identifyAnalyticsUser, resetAnalyticsUser } from '@/services/analytics';

SplashScreen.preventAutoHideAsync();

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

// Configure RevenueCat once on JS load (before any component renders).
configurePurchases();

// Initialize PostHog analytics (async, non-blocking).
void configureAnalytics();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, userId } = useAuth();
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

  // Link RevenueCat ↔ Clerk user. Uses a ref to avoid re-firing on Clerk
  // session-refresh churn (getToken/isSignedIn references change on refresh).
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && userId && userId !== prevUserIdRef.current) {
      prevUserIdRef.current = userId;
      void identifyUser(userId);
      identifyAnalyticsUser(userId);
    } else if (!isSignedIn && prevUserIdRef.current) {
      prevUserIdRef.current = null;
      void resetUser();
      resetAnalyticsUser();
    }
  }, [isLoaded, isSignedIn, userId]);

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
            <Stack.Screen name="privacy" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="sign-in" />
          </Stack>
        </AuthGate>
        <StatusBar style="light" />
      </ThemeProvider>
    </ClerkProvider>
  );
}
