import { PostHog } from 'posthog-react-native';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let posthog: PostHog | null = null;

/**
 * Call once on app startup.
 * Safe to call if no key is configured — silently skips.
 */
export async function configureAnalytics(): Promise<void> {
  if (!POSTHOG_KEY || posthog) return;

  posthog = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
  });
}

/**
 * Link analytics to a Clerk user id after sign-in.
 */
export function identifyAnalyticsUser(clerkUserId: string): void {
  posthog?.identify(clerkUserId);
}

/**
 * Reset analytics identity on sign-out.
 */
export function resetAnalyticsUser(): void {
  posthog?.reset();
}

export { posthog };
