import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { asyncStorageKv } from '@/data/asyncStorageKv';
import type { KVStore } from '@/data/kv';
import { KEY_PREFIX } from '@/data/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODE_KEY = `${KEY_PREFIX}themeMode`;
const VALID_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

// Unlike RepositoryProvider/ConfirmProvider, this context carries a safe
// default (system, no-op setMode) instead of throwing when unwrapped:
// useTheme() is called by nearly every leaf component, including ones
// under bare component-level tests with no provider tree at all, and
// those must keep resolving to the OS color scheme exactly as before.
const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'system',
  setMode: () => {},
});

export function useThemeMode(): ThemeModeContextValue {
  return useContext(ThemeModeContext);
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && (VALID_MODES as string[]).includes(value);
}

export function ThemeModeProvider({
  children,
  store,
}: {
  children: ReactNode;
  /** Tests inject an in-memory store; the app leaves this undefined. */
  store?: KVStore;
}) {
  const kv = useMemo(() => store ?? asyncStorageKv, [store]);
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    kv.getItem(THEME_MODE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (isThemeMode(stored)) setModeState(stored);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [kv]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      kv.setItem(THEME_MODE_KEY, next).catch(() => {});
    },
    [kv],
  );

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  if (!ready) return null;

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}
