import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const RC_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const RC_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

let configured = false;

/**
 * Call once on app startup (before any Purchases calls).
 * Safe to call on web — silently skips if no key is available.
 */
export function configurePurchases(): void {
  const apiKey = Platform.OS === 'ios' ? RC_KEY_IOS : RC_KEY_ANDROID;
  if (!apiKey || configured) return;

  Purchases.configure({ apiKey });

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  configured = true;
}

/**
 * Link the RevenueCat anonymous user to a Clerk user id.
 * Call after Clerk sign-in so webhooks carry the right `app_user_id`.
 */
export async function identifyUser(clerkUserId: string): Promise<void> {
  if (!configured) return;
  await Purchases.logIn(clerkUserId);
}

/**
 * Unlink the current user on sign-out.
 */
export async function resetUser(): Promise<void> {
  if (!configured) return;
  await Purchases.logOut();
}
