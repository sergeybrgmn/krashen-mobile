const ANSWER_LANGUAGE_MAP: Record<string, string[]> = {
  es: ['en'],
  en: ['es'],
  fr: ['en'],
};

const DEFAULT_ANSWER_LANGUAGES = ['en'];

export function getAnswerLanguages(podcastLanguage: string): string[] {
  return ANSWER_LANGUAGE_MAP[podcastLanguage.toLowerCase()] ?? DEFAULT_ANSWER_LANGUAGES;
}
