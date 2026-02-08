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
  translation: string;
  pos: string;
  meaning: string;
  pattern: string;
  usage_notes: string;
  example: string;
}

export interface EpisodeData {
  segments: Segment[];
  explanations: Record<string, { words: WordExplanation[] }>;
}

export interface AskResponse {
  answer: string;
}

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    const err = new Error(`API ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function fetchPodcasts(): Promise<Podcast[]> {
  return fetchJSON('/api/podcasts');
}

export function fetchEpisodes(podcastId: string): Promise<Episode[]> {
  return fetchJSON(`/api/podcast/${podcastId}/episodes`);
}

export function fetchEpisodeData(
  episodeId: string,
  targetLanguage: string,
): Promise<EpisodeData> {
  return fetchJSON(
    `/api/episode/${episodeId}/data?target_language=${encodeURIComponent(targetLanguage)}`,
  );
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
    const err = new Error(`API ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}
