import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (active) {
      activateKeepAwakeAsync('lemino');
    } else {
      deactivateKeepAwake('lemino');
    }
    return () => {
      deactivateKeepAwake('lemino');
    };
  }, [active]);
}
