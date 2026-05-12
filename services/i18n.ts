import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import es from '@/locales/es.json';

export const SUPPORTED_UI_LANGUAGES = ['en', 'es'] as const;
export type UiLanguage = (typeof SUPPORTED_UI_LANGUAGES)[number];

const STORAGE_KEY = 'krashen-ui-language';
const FALLBACK: UiLanguage = 'en';

function isSupported(code: string | undefined | null): code is UiLanguage {
  return !!code && (SUPPORTED_UI_LANGUAGES as readonly string[]).includes(code);
}

function detectDeviceLanguage(): UiLanguage {
  const code = Localization.getLocales()[0]?.languageCode?.toLowerCase();
  return isSupported(code) ? code : FALLBACK;
}

// Initialize synchronously with the device locale so the very first render
// already has the right strings. Stored override (if any) is applied after.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectDeviceLanguage(),
  fallbackLng: FALLBACK,
  interpolation: { escapeValue: false },
  returnNull: false,
  compatibilityJSON: 'v4',
});

// Load persisted override (if any) and switch.
void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
  if (isSupported(stored) && stored !== i18n.language) {
    void i18n.changeLanguage(stored);
  }
});

export async function setUiLanguage(lang: UiLanguage): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
