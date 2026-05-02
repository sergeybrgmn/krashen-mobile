const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://pregunta.app';

export interface Podcast {
  id: string;
  title: string;
  cover_url: string;
  language: string;
}

export interface Episode {
  id: string;
  title: string;
  audio_url: string | null;
  published_at: string | null;
  duration: number | null;
  explanation_languages: string[];
  is_free: boolean;
}

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface WordExplanation {
  surface: string;
  start_char: number;
  end_char: number;
  translation: string | null;
  pos: string;
  lemma?: string;
  meaning: string;
  pattern: string | null;
  usage_notes: string | null;
  example: string | null;
}

export interface EpisodeData {
  segments: Segment[];
  explanations: Record<string, { words: WordExplanation[] }>;
}

export interface AskResponse {
  answer: string;
}

export interface Me {
  id: string;
  name: string | null;
  email: string | null;
  response_language: string | null;
  questions_left: number;
  is_subscribed: boolean;
  subscription_status: string | null;
  subscription_expires_at: string | null;
  created_at: string;
}

export type ApiError = Error & {
  status: number;
  detail?: { code?: string; message?: string; reset_at?: string };
};

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    const err = new Error(`API ${res.status}`) as ApiError;
    err.status = res.status;
    if (res.status === 403) {
      try {
        const body = await res.json();
        err.detail = body.detail;
      } catch { /* ignore parse errors */ }
    }
    throw err;
  }
  return res.json();
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function fetchPodcasts(token: string): Promise<Podcast[]> {
  return fetchJSON('/api/podcasts', { headers: authHeaders(token) });
}

export function fetchEpisodes(token: string, podcastId: string): Promise<Episode[]> {
  return fetchJSON(`/api/podcast/${podcastId}/episodes`, { headers: authHeaders(token) });
}

export function fetchEpisodeData(
  token: string,
  episodeId: string,
  targetLanguage: string,
): Promise<EpisodeData> {
  return fetchJSON(
    `/api/episode/${episodeId}/data?target_language=${encodeURIComponent(targetLanguage)}`,
    { headers: authHeaders(token) },
  );
}

export async function fetchMe(token: string): Promise<Me> {
  const res = await fetch(`${API_BASE_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = new Error(`API ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function updateMe(
  token: string,
  patch: { response_language?: string | null },
): Promise<Me> {
  const res = await fetch(`${API_BASE_URL}/api/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = new Error(`API ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function submitQuestion(
  token: string,
  episodeId: string,
  timestamp: number,
  responseLanguage: string,
  audioUri: string,
): Promise<AskResponse> {
  const formData = new FormData();
  formData.append('episode_id', episodeId);
  formData.append('timestamp', String(timestamp));
  formData.append('response_language', responseLanguage);
  formData.append('question_audio', {
    uri: audioUri,
    type: 'audio/mp4',
    name: 'q.m4a',
  } as unknown as Blob);

  const res = await fetch(`${API_BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = new Error(`API ${res.status}`) as Error & {
      status: number;
      detail?: { code?: string; message?: string; reset_at?: string };
    };
    err.status = res.status;
    if (res.status === 403) {
      try {
        const body = await res.json();
        err.detail = body.detail;
      } catch { /* ignore parse errors */ }
    }
    throw err;
  }
  return res.json();
}
