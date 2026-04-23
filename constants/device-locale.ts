import { getLocales } from 'expo-localization';

import { LANGUAGES } from '@/constants/languages';

const SUPPORTED = new Set(LANGUAGES.map((l) => l.code));

export function getDeviceLanguageCode(fallback = 'en'): string {
  const code = getLocales()[0]?.languageCode?.toLowerCase();
  return code && SUPPORTED.has(code) ? code : fallback;
}
