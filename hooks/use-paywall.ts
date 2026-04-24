import { useCallback } from 'react';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { posthog } from '@/services/analytics';

/**
 * Returns a function that presents the RevenueCat paywall.
 * Resolves to `true` if the user purchased or restored, `false` if dismissed.
 *
 * The paywall is designed in the RevenueCat dashboard — no React code needed.
 * It auto-closes on successful purchase and returns the result.
 */
export function usePaywall() {
  const presentPaywall = useCallback(async (): Promise<boolean> => {
    posthog?.capture('paywall_shown');

    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: 'pro',
    });
    const purchased =
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED;

    posthog?.capture(purchased ? 'paywall_purchased' : 'paywall_dismissed');

    return purchased;
  }, []);

  return presentPaywall;
}
