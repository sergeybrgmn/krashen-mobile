import { useCallback } from 'react';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

/**
 * Returns a function that presents the RevenueCat paywall.
 * Resolves to `true` if the user purchased or restored, `false` if dismissed.
 *
 * The paywall is designed in the RevenueCat dashboard — no React code needed.
 * It auto-closes on successful purchase and returns the result.
 */
export function usePaywall() {
  const presentPaywall = useCallback(async (): Promise<boolean> => {
    const result = await RevenueCatUI.presentPaywall({
      requiredEntitlementIdentifier: 'pro',
    });
    return (
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED
    );
  }, []);

  return presentPaywall;
}
