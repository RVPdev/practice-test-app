import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import type { Attempt } from '@/core/types';
import { useRepository, useRepositoryReady } from '@/data/RepositoryProvider';
import { HistoryView } from '@/ui/HistoryView';

export default function HistoryScreen() {
  const repository = useRepository();
  const ready = useRepositoryReady();
  const router = useRouter();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [setTitles, setSetTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!ready) return;
      setLoading(true);
      Promise.all([repository.listAttempts(), repository.listSets()])
        .then(([loadedAttempts, sets]) => {
          if (cancelled) return;
          setAttempts(loadedAttempts);
          setSetTitles(Object.fromEntries(sets.map((s) => [s.id, s.title])));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [repository, ready]),
  );

  return (
    <HistoryView
      attempts={attempts}
      setTitles={setTitles}
      loading={loading || !ready}
      onOpenAttempt={(attemptId) => router.push(`/results/${encodeURIComponent(attemptId)}`)}
    />
  );
}
