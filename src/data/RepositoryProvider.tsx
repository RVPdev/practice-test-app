import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { asyncStorageKv } from './asyncStorageKv';
import { seedBundledSets } from './bundled';
import type { Repository } from './repository';
import { createStorageRepository } from './storage';

const RepositoryContext = createContext<{ repository: Repository; ready: boolean } | null>(null);

export function RepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode;
  /** Tests inject a repository over an in-memory KV; the app leaves this undefined. */
  repository?: Repository;
}) {
  const repo = useMemo(
    () => repository ?? createStorageRepository(asyncStorageKv),
    [repository],
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    seedBundledSets(repo)
      .catch((error) => console.error('Failed to seed bundled sets', error))
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const value = useMemo(() => ({ repository: repo, ready }), [repo, ready]);

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

export function useRepository(): Repository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useRepository must be used inside a RepositoryProvider');
  return context.repository;
}

export function useRepositoryReady(): boolean {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useRepositoryReady must be used inside a RepositoryProvider');
  return context.ready;
}
