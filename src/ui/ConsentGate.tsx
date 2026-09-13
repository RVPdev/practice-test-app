import { useEffect, useState, type ReactNode } from 'react';
import { useRepository, useRepositoryReady } from '@/data/RepositoryProvider';
import { WelcomeView } from './WelcomeView';

/**
 * Blocks the rest of the app behind the welcome/consent screen until the
 * user has accepted the Privacy Policy and Terms of Service at least once.
 * Renders nothing while that's still being determined, to avoid a flash of
 * one state before the other.
 */
export function ConsentGate({ children }: { children: ReactNode }) {
  const repository = useRepository();
  const ready = useRepositoryReady();
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    repository.getTermsAccepted().then((value) => {
      if (!cancelled) setAccepted(value);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, repository]);

  if (!ready || accepted === null) return null;

  if (!accepted) {
    return (
      <WelcomeView
        onAccept={() => {
          setAccepted(true);
          void repository.acceptTerms();
        }}
      />
    );
  }

  return <>{children}</>;
}
