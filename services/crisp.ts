import {
  configure,
  resetSession,
  setSessionString,
  setTokenId,
  setUserEmail,
  setUserNickname,
  show,
} from 'crisp-sdk-react-native';

const WEBSITE_ID = process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID ?? '';

let configured = false;

/**
 * Call once on app startup. Safe to call if no website ID is set — silently skips,
 * so dev builds without Crisp credentials still boot cleanly.
 */
export function configureCrisp(): void {
  if (configured) return;
  if (!WEBSITE_ID) {
    if (__DEV__) {
      console.warn(
        '[crisp] EXPO_PUBLIC_CRISP_WEBSITE_ID is not set — chat is disabled. ' +
          'Add it to .env and rebuild natives.',
      );
    }
    return;
  }
  configure(WEBSITE_ID);
  configured = true;
  if (__DEV__) console.log('[crisp] configured with website id', WEBSITE_ID);
}

export type CrispUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

/**
 * Link the Crisp session to a Clerk user. Called after sign-in so messages
 * in the Crisp dashboard are attached to a known identity.
 */
export function identifyCrispUser(user: CrispUser): void {
  if (!configured) return;
  setTokenId(user.id);
  setSessionString('clerk_user_id', user.id);
  if (user.email) setUserEmail(user.email);
  if (user.name) setUserNickname(user.name);
}

/**
 * Unlink the current user on sign-out. The next sign-in will re-identify.
 */
export function resetCrispUser(): void {
  if (!configured) return;
  setTokenId(null);
  resetSession();
}

/**
 * Open the Crisp chat UI. No-op if Crisp isn't configured.
 */
export function openSupportChat(): void {
  if (!configured) {
    if (__DEV__) {
      console.warn(
        '[crisp] openSupportChat called but SDK is not configured. ' +
          'Check EXPO_PUBLIC_CRISP_WEBSITE_ID and that you rebuilt natives after installing the package.',
      );
    }
    return;
  }
  show();
}

export function isCrispConfigured(): boolean {
  return configured;
}
