import { useCallback, useEffect, useState } from 'react';

import {
  getConsent,
  isGdprRegion,
  loadConsent,
  setConsent,
  subscribeConsent,
  type ConsentValue,
} from '@/services/consent';

export function useConsent() {
  const [value, setValue] = useState<ConsentValue | null>(getConsent());

  useEffect(() => {
    let mounted = true;
    loadConsent().then((v) => {
      if (mounted) setValue(v);
    });
    const unsub = subscribeConsent((v) => {
      if (mounted) setValue(v);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const accepted = value === 'accepted';

  const update = useCallback((next: boolean) => {
    void setConsent(next ? 'accepted' : 'rejected');
  }, []);

  return {
    accepted,
    update,
    isGdpr: isGdprRegion(),
  };
}
