import { useCallback, useState } from 'react';

import { AskResponse, submitQuestion } from '@/services/api';

export function useAskQuestion() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (
      token: string,
      episodeId: string,
      timestamp: number,
      responseLanguage: string,
      audioUri: string,
    ): Promise<AskResponse> => {
      setIsSubmitting(true);
      try {
        return await submitQuestion(token, episodeId, timestamp, responseLanguage, audioUri);
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return { isSubmitting, submit };
}
