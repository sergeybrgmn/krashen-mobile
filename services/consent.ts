import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCalendars } from 'expo-localization';

const STORAGE_KEY = 'krashen_consent_v1';

// Timezones that imply the user is in the EEA, UK, or Switzerland — i.e. GDPR/UK-GDPR territory.
// Explicit allowlist avoids false positives for Europe/Moscow, Europe/Istanbul, Europe/Kyiv, etc.
const GDPR_TIMEZONES = new Set<string>([
  'Europe/Amsterdam',
  'Europe/Andorra',
  'Europe/Athens',
  'Europe/Belgrade',
  'Europe/Berlin',
  'Europe/Bratislava',
  'Europe/Brussels',
  'Europe/Bucharest',
  'Europe/Budapest',
  'Europe/Busingen',
  'Europe/Copenhagen',
  'Europe/Dublin',
  'Europe/Gibraltar',
  'Europe/Guernsey',
  'Europe/Helsinki',
  'Europe/Isle_of_Man',
  'Europe/Jersey',
  'Europe/Lisbon',
  'Europe/Ljubljana',
  'Europe/London',
  'Europe/Luxembourg',
  'Europe/Madrid',
  'Europe/Malta',
  'Europe/Mariehamn',
  'Europe/Monaco',
  'Europe/Oslo',
  'Europe/Paris',
  'Europe/Podgorica',
  'Europe/Prague',
  'Europe/Riga',
  'Europe/Rome',
  'Europe/San_Marino',
  'Europe/Sarajevo',
  'Europe/Skopje',
  'Europe/Sofia',
  'Europe/Stockholm',
  'Europe/Tallinn',
  'Europe/Tirane',
  'Europe/Vaduz',
  'Europe/Vatican',
  'Europe/Vienna',
  'Europe/Vilnius',
  'Europe/Warsaw',
  'Europe/Zagreb',
  'Europe/Zurich',
  'Atlantic/Azores',
  'Atlantic/Canary',
  'Atlantic/Faroe',
  'Atlantic/Madeira',
  'Atlantic/Reykjavik',
  'Asia/Famagusta',
  'Asia/Nicosia',
]);

export type ConsentValue = 'accepted' | 'rejected';

let consentValue: ConsentValue | null = null;
let loaded = false;
const listeners = new Set<(v: ConsentValue) => void>();

export function isGdprRegion(): boolean {
  try {
    const tz = getCalendars()[0]?.timeZone;
    return tz ? GDPR_TIMEZONES.has(tz) : false;
  } catch {
    // If we can't detect, err on the side of caution (treat as GDPR).
    return true;
  }
}

export async function loadConsent(): Promise<ConsentValue> {
  if (loaded && consentValue) return consentValue;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === 'accepted' || stored === 'rejected') {
      consentValue = stored;
    } else {
      // No stored choice — apply regional default.
      consentValue = isGdprRegion() ? 'rejected' : 'accepted';
    }
  } catch {
    consentValue = isGdprRegion() ? 'rejected' : 'accepted';
  }

  loaded = true;
  return consentValue;
}

export function getConsent(): ConsentValue | null {
  return consentValue;
}

export async function setConsent(value: ConsentValue): Promise<void> {
  consentValue = value;
  loaded = true;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn(value));
}

export function subscribeConsent(fn: (v: ConsentValue) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
