import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useRepository, useRepositoryReady } from '@/data/RepositoryProvider';
import type { SetSummary } from '@/data/repository';
import { HiddenSetsView } from '@/ui/HiddenSetsView';

export default function HiddenSetsScreen() {
  const repository = useRepository();
  const ready = useRepositoryReady();
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!ready) return;
      setLoading(true);
      repository.listHiddenSets().then((result) => {
        if (!cancelled) {
          setSets(result);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [repository, ready]),
  );

  const restore = async (setId: string) => {
    await repository.restoreBundledSet(setId);
    setSets((prev) => prev.filter((s) => s.id !== setId));
  };

  return <HiddenSetsView sets={sets} loading={loading} onRestore={restore} />;
}
