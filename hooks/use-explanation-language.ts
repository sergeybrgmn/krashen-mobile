import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'krashen-explanation-language';

export function useExplanationLanguage() {
  const [explanationLanguage, setExplanationLanguage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      setExplanationLanguage(val);
      setLoaded(true);
    });
  }, []);

  async function saveExplanationLanguage(lang: string) {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    setExplanationLanguage(lang);
  }

  return { explanationLanguage, loaded, saveExplanationLanguage };
}
