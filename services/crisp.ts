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
  if (!WEBSITE_ID || configured) return;
  configure(WEBSITE_ID);
  configured = true;
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
  if (!configured) return;
  show();
}

export function isCrispConfigured(): boolean {
  return configured;
}
