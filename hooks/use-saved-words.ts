import { useCallback, useEffect, useState } from 'react';

import { SavedWord, deleteSavedWord, fetchSavedWords, saveWord } from '@/services/api';
import { useAuthToken } from '@/hooks/use-auth-token';

/** Map key for a saved word within an episode: `${segment_index}:${start_char}`. */
function keyFor(segmentIndex: number, startChar: number): string {
  return `${segmentIndex}:${startChar}`;
}

/**
 * Tracks which words the user has saved for the current episode/language.
 *
 * Fetches on mount and whenever the episode or language changes (limit 200
 * covers any realistic per-episode count — no pagination here). Keeps stale
 * data while a refetch is in flight to avoid a flash, mirroring
 * `use-episode-questions.ts`.
 *
 * `save`/`remove` update local state only on success and rethrow on failure so
 * the caller can react to `pro_required` (see the player's toggle handler).
 */
export function useSavedWords(
  episodeId: string | undefined,
  targetLanguage: string | undefined,
) {
  const [savedByKey, setSavedByKey] = useState<Map<string, SavedWord>>(new Map());
  const [pending, setPending] = useState(false);
  const getToken = useAuthToken();

  useEffect(() => {
    if (!episodeId || !targetLanguage) return;

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const page = await fetchSavedWords(token, { episodeId, targetLanguage, limit: 200 });
        if (cancelled) return;
        const map = new Map<string, SavedWord>();
        for (const w of page.items) {
          map.set(keyFor(w.segment_index, w.start_char), w);
        }
        setSavedByKey(map);
      } catch (e) {
        if (!cancelled) console.warn('Failed to load saved words', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [episodeId, targetLanguage, getToken]);

  const save = useCallback(
    async (segmentIndex: number, startChar: number): Promise<void> => {
      if (!episodeId || !targetLanguage) return;
      setPending(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('Not signed in');
        const saved = await saveWord(token, {
          episode_id: episodeId,
          target_language: targetLanguage,
          segment_index: segmentIndex,
          start_char: startChar,
        });
        setSavedByKey((prev) => {
          const next = new Map(prev);
          next.set(keyFor(saved.segment_index, saved.start_char), saved);
          return next;
        });
      } catch (e) {
        console.warn('Failed to save word', e);
        throw e;
      } finally {
        setPending(false);
      }
    },
    [episodeId, targetLanguage, getToken],
  );

  const remove = useCallback(
    async (savedWord: SavedWord): Promise<void> => {
      setPending(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('Not signed in');
        await deleteSavedWord(token, savedWord.id);
        setSavedByKey((prev) => {
          const next = new Map(prev);
          next.delete(keyFor(savedWord.segment_index, savedWord.start_char));
          return next;
        });
      } catch (e) {
        console.warn('Failed to remove saved word', e);
        throw e;
      } finally {
        setPending(false);
      }
    },
    [getToken],
  );

  return { savedByKey, save, remove, pending };
}
