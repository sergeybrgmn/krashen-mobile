import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  PlaybackProgress,
  fetchEpisodeProgress,
  fetchPodcastProgress,
} from '@/services/api';

/**
 * Where the listener stopped in each episode, so playback resumes there.
 *
 * Two copies: one on the device (AsyncStorage) and, for signed-in users, one on
 * the backend — the server copy is what survives a reinstall or a new phone.
 * Guests have only the device copy. Whichever copy was written last wins; the
 * device copy can be the newer one when a save to the server failed offline.
 */

export interface SavedProgress {
  /** Seconds into the episode. */
  position: number;
  /** Seconds, as the player measured it; null if unknown at save time. */
  duration: number | null;
  /** Epoch ms when this position was recorded. */
  updatedAt: number;
}

const KEY_PREFIX = 'playback-progress:';

/** Don't wait longer than this on the server before starting playback. */
const SERVER_TIMEOUT_MS = 3_000;

/** Closer than this to the end counts as finished (capped at 5% for short episodes). */
const FINISHED_TAIL_SECONDS = 30;

/** Less than this in, there's nothing worth resuming. */
const MIN_RESUME_SECONDS = 5;

// Mirrors every write, so a screen that reads straight after another one saved
// (player → episode list) never sees a stale value while AsyncStorage catches up.
const memory = new Map<string, SavedProgress>();

type Listener = (episodeId: string, progress: SavedProgress) => void;
const listeners = new Set<Listener>();

export function isFinished(position: number, duration: number | null): boolean {
  if (!duration || duration <= 0) return false;
  return position >= duration - Math.min(FINISHED_TAIL_SECONDS, duration * 0.05);
}

/** Where to start playback: the saved spot, or 0 when finished or barely started. */
export function resumePosition(progress: SavedProgress | null): number {
  if (!progress) return 0;
  if (progress.position < MIN_RESUME_SECONDS) return 0;
  if (isFinished(progress.position, progress.duration)) return 0;
  return progress.position;
}

function fromServer(p: PlaybackProgress): SavedProgress {
  // The backend sends microseconds; Date.parse is only specified for milliseconds.
  const updatedAt = Date.parse(p.updated_at.replace(/(\.\d{3})\d+/, '$1'));
  return { position: p.position, duration: p.duration, updatedAt: updatedAt || 0 };
}

function newer(a: SavedProgress | null, b: SavedProgress | null): SavedProgress | null {
  if (!a) return b;
  if (!b) return a;
  return b.updatedAt > a.updatedAt ? b : a;
}

function parse(raw: string | null): SavedProgress | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as SavedProgress;
    return typeof v.position === 'number' && typeof v.updatedAt === 'number' ? v : null;
  } catch {
    return null;
  }
}

export async function readLocalProgress(episodeId: string): Promise<SavedProgress | null> {
  const cached = memory.get(episodeId);
  if (cached) return cached;
  try {
    const stored = parse(await AsyncStorage.getItem(KEY_PREFIX + episodeId));
    if (stored) memory.set(episodeId, stored);
    return stored;
  } catch {
    return null;
  }
}

async function readLocalProgressMany(episodeIds: string[]): Promise<Map<string, SavedProgress>> {
  const result = new Map<string, SavedProgress>();
  const missing: string[] = [];
  for (const id of episodeIds) {
    const cached = memory.get(id);
    if (cached) result.set(id, cached);
    else missing.push(id);
  }
  if (missing.length === 0) return result;
  try {
    const pairs = await AsyncStorage.multiGet(missing.map((id) => KEY_PREFIX + id));
    for (const [key, raw] of pairs) {
      const stored = parse(raw);
      if (!stored) continue;
      const id = key.slice(KEY_PREFIX.length);
      memory.set(id, stored);
      result.set(id, stored);
    }
  } catch {
    // Device copy unreadable — the server copy (if any) still applies.
  }
  return result;
}

/** Record a position on the device. The in-memory copy updates synchronously. */
export async function writeLocalProgress(episodeId: string, progress: SavedProgress): Promise<void> {
  memory.set(episodeId, progress);
  listeners.forEach((listener) => listener(episodeId, progress));
  try {
    await AsyncStorage.setItem(KEY_PREFIX + episodeId, JSON.stringify(progress));
  } catch {
    // Best effort: the server copy covers signed-in users.
  }
}

/** Called with every device write — keeps an open episode list in step with the player. */
export function subscribeLocalProgress(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Forget every device copy. On sign-out, so the next account doesn't inherit them. */
export async function clearLocalProgress(): Promise<void> {
  memory.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(KEY_PREFIX)));
  } catch {
    // Nothing else to do.
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * The newest known position for an episode, from the device and (with a token)
 * the server. Never throws: an unreachable server just means the device copy.
 */
export async function loadProgress(
  episodeId: string,
  token: string | null,
): Promise<SavedProgress | null> {
  const [local, remote] = await Promise.all([
    readLocalProgress(episodeId),
    token
      ? withTimeout(fetchEpisodeProgress(token, episodeId), SERVER_TIMEOUT_MS).catch(() => null)
      : Promise.resolve(null),
  ]);
  const server = remote ? fromServer(remote) : null;
  const best = newer(local, server);
  // Server copy won (e.g. fresh install): keep it on the device too.
  if (best && best === server) void writeLocalProgress(episodeId, best);
  return best;
}

/** Newest known position for each listed episode of a podcast. */
export async function loadPodcastProgress(
  podcastId: string,
  episodeIds: string[],
  token: string | null,
): Promise<Map<string, SavedProgress>> {
  const [local, remote] = await Promise.all([
    readLocalProgressMany(episodeIds),
    token ? fetchPodcastProgress(token, podcastId).catch(() => []) : Promise.resolve([]),
  ]);
  const merged = new Map(local);
  for (const item of remote) {
    const best = newer(merged.get(item.episode_id) ?? null, fromServer(item));
    if (best) merged.set(item.episode_id, best);
  }
  return merged;
}
