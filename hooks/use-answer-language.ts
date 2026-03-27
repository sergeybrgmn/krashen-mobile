import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'krashen-answer-language';

export function useAnswerLanguage() {
  const [answerLanguage, setAnswerLanguage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      setAnswerLanguage(val);
      setLoaded(true);
    });
  }, []);

  async function saveAnswerLanguage(lang: string) {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    setAnswerLanguage(lang);
  }

  return { answerLanguage, loaded, saveAnswerLanguage };
}
