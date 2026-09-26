/**
 * Deep links arrive here before expo-router routes them.
 *
 * Clerk's OAuth flow redirects to `krashen://sso-callback?created_session_id=…`.
 * On iOS that redirect is consumed inside ASWebAuthenticationSession and never
 * reaches the router, but on Android the Custom Tab hands it to the OS as a real
 * deep link — and with no matching route, expo-router renders `+not-found`. The
 * result is a flash of "Unmatched Route" immediately after a *successful* sign-in.
 *
 * There is genuinely nothing for the router to do with it: `useSSO().startSSOFlow`
 * resolves from the browser session itself, and `sign-in` navigates onward from
 * `finishAuth()`. Adding a real route is worse than useless — it gets pushed onto
 * the stack, so `finishAuth()`'s `router.back()` pops straight back to sign-in.
 *
 * Returning an empty string makes expo-router drop the link: its listener only
 * fires for a truthy href (`subscribe` in expo-router/build/link/linking.js).
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (path.includes('sso-callback')) {
      return '';
    }
  } catch {
    // Never throw from here — expo-router warns it can crash the app.
  }
  return path;
}
