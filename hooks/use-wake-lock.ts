import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (active) {
      activateKeepAwakeAsync('krashen');
    } else {
      deactivateKeepAwake('krashen');
    }
    return () => {
      deactivateKeepAwake('krashen');
    };
  }, [active]);
}
