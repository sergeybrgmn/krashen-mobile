import { useAuth } from '@clerk/clerk-expo';
import i18n from 'i18next';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Me, fetchMe } from '@/services/api';
import { SUPPORTED_UI_LANGUAGES, setUiLanguage, UiLanguage } from '@/services/i18n';

interface MeContextValue {
  me: Me | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const MeContext = createContext<MeContextValue | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Stash Clerk fns in a ref so `refetch` identity stays stable across
  // session-refresh-driven re-renders (Clerk reissues these every render).
  const authRef = useRef({ getToken, isSignedIn });
  authRef.current = { getToken, isSignedIn };

  const refetch = useCallback(async () => {
    if (!authRef.current.isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const jwtTemplate = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
      const token = await authRef.current.getToken(
        jwtTemplate ? { template: jwtTemplate } : undefined,
      );
      if (!token) throw new Error('No auth token');
      const data = await fetchMe(token);
      setMe(data);

      // Sync server-stored UI language to i18n on load. Server is the source of
      // truth across devices; AsyncStorage cache (set by setUiLanguage) keeps
      // the next cold start instant.
      const serverLang = data.ui_language;
      if (
        serverLang &&
        (SUPPORTED_UI_LANGUAGES as readonly string[]).includes(serverLang) &&
        serverLang !== i18n.language
      ) {
        void setUiLanguage(serverLang as UiLanguage);
      }
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on sign-in. Clears state on sign-out so a different user signing
  // in doesn't briefly see the previous user's profile.
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      void refetch();
    } else {
      setMe(null);
    }
  }, [isLoaded, isSignedIn, refetch]);

  return (
    <MeContext.Provider value={{ me, loading, error, refetch }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe(): MeContextValue {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error('useMe must be used within <MeProvider>');
  return ctx;
}
