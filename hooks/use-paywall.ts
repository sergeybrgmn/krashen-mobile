import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { posthog } from '@/services/analytics';
import { PRO_ENTITLEMENT } from '@/services/purchases';

/** Shape of the errors RevenueCat rejects with. All fields are best-effort. */
type PaywallError = {
  code?: string | number;
  readableErrorCode?: string;
  underlyingErrorMessage?: string;
  message?: string;
};

/**
 * Returns a function that presents the RevenueCat paywall.
 * Resolves to `true` if the user purchased or restored, `false` otherwise —
 * including on failure, so callers can treat it as "did not buy" and their
 * existing `if (!purchased) return` paths stay correct.
 *
 * The paywall is designed in the RevenueCat dashboard — no React code needed.
 * It auto-closes on successful purchase and returns the result.
 *
 * Failures are contained here rather than at the six call sites. That matters
 * most on the Pro-gated player, where an uncaught throw skipped the
 * `router.back()` branch and stranded the user on a screen they couldn't use.
 */
export function usePaywall() {
  const { t } = useTranslation();

  const reportFailure = useCallback(
    (reason: string, err?: PaywallError) => {
      // RevenueCat's debug logging is __DEV__-only, so a TestFlight build
      // reports nothing on its own. Capture the underlying cause here or
      // configuration errors are undiagnosable off a cable.
      posthog?.capture('paywall_error', {
        reason,
        code: err?.code ?? null,
        readable_error_code: err?.readableErrorCode ?? null,
        underlying_error_message: err?.underlyingErrorMessage ?? null,
        message: err?.message ?? null,
      });
      Alert.alert(t('errors.paywallTitle'), t('errors.paywallUnavailable'));
    },
    [t],
  );

  const presentPaywall = useCallback(async (): Promise<boolean> => {
    posthog?.capture('paywall_shown');

    let result: PAYWALL_RESULT;
    try {
      result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: PRO_ENTITLEMENT,
      });
    } catch (e) {
      // Thrown for configuration problems — products missing from App Store
      // Connect, entitlement name mismatch — and for store failures.
      reportFailure('threw', e as PaywallError);
      return false;
    }

    // The paywall can also fail without throwing.
    if (result === PAYWALL_RESULT.ERROR) {
      reportFailure('result_error');
      return false;
    }

    const purchased =
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED;

    posthog?.capture(purchased ? 'paywall_purchased' : 'paywall_dismissed');

    return purchased;
  }, [reportFailure]);

  return presentPaywall;
}
