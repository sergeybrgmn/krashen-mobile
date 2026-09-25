import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Landing route for the OAuth redirect `krashen://sso-callback`.
 *
 * On iOS the redirect is consumed inside `ASWebAuthenticationSession` and never
 * reaches the router, but on Android the Custom Tab hands the URL to the OS as a
 * real deep link — so expo-router resolves it before Clerk's `startSSOFlow`
 * promise settles. Without this route that moment renders as `+not-found`.
 *
 * Nothing to do here: `sign-in` owns the flow and calls `finishAuth()` to
 * navigate away as soon as the session is active. This just has to look like
 * part of the sign-in, not an error.
 */
export default function SSOCallback() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.cyan} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
