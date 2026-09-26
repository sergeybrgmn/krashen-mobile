import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

const TAG = 'krashen';

/** Release the lock, ignoring "already released" and dead-activity errors. */
async function release() {
  try {
    await deactivateKeepAwake(TAG);
  } catch {
    // Nothing to release, or the activity is gone.
  }
}

/**
 * Hold the screen awake while audio is playing or recording.
 *
 * Both calls are guarded: on Android they reject when the activity isn't in a
 * resumable state, and an unguarded `activateKeepAwakeAsync` surfaced as an
 * "Unable to activate keep awake" unhandled rejection. A failed wake lock isn't
 * worth propagating — the screen dimming early is the entire downside.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (active) {
      activateKeepAwakeAsync(TAG).catch(() => {});
    } else {
      void release();
    }
    return () => {
      void release();
    };
  }, [active]);
}
