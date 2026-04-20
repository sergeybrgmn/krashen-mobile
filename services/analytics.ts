import { PostHog } from 'posthog-react-native';

import { getConsent, loadConsent, subscribeConsent, type ConsentValue } from './consent';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let posthog: PostHog | null = null;
let currentUserId: string | null = null;

/**
 * Call once on app startup.
 * Safe to call if no key is configured — silently skips.
 * Honors the consent value from services/consent.ts:
 * EU/UK users are opt-out by default until they flip the toggle.
 */
export async function configureAnalytics(): Promise<void> {
  if (!POSTHOG_KEY || posthog) return;

  const consent = await loadConsent();

  posthog = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
  });

  applyConsent(consent);
  subscribeConsent(applyConsent);
}

function applyConsent(value: ConsentValue): void {
  if (!posthog) return;
  if (value === 'accepted') {
    try {
      posthog.optIn?.();
    } catch {
      // older SDK versions may not have optIn — capture calls below act as the gate.
    }
    if (currentUserId) {
      posthog.identify(currentUserId);
    }
  } else {
    try {
      posthog.optOut?.();
    } catch {
      // ignore
    }
  }
}

/**
 * Link analytics to a Clerk user id after sign-in. Remembered across consent changes,
 * so if the user later opts in we can still identify them.
 */
export function identifyAnalyticsUser(clerkUserId: string): void {
  currentUserId = clerkUserId;
  if (posthog && getConsent() === 'accepted') {
    posthog.identify(clerkUserId);
  }
}

/**
 * Reset analytics identity on sign-out.
 */
export function resetAnalyticsUser(): void {
  currentUserId = null;
  posthog?.reset();
}

export { posthog };
