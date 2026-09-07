import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useRepository, useRepositoryReady } from '@/data/RepositoryProvider';
import type { SetSummary } from '@/data/repository';
import { LibraryView } from '@/ui/LibraryView';

export default function LibraryScreen() {
  const repository = useRepository();
  const ready = useRepositoryReady();
  const router = useRouter();
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Refresh on focus so a new import or a finished attempt shows immediately.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!ready) return;
      setLoading(true);
      repository
        .listSets()
        .then((result) => {
          if (!cancelled) setSets(result);
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
    <LibraryView
      sets={sets}
      loading={loading || !ready}
      onOpenSet={(setId) => router.push(`/set/${setId}`)}
      onImport={() => router.push('/import')}
    />
  );
}
