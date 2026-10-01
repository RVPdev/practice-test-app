import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useRepository, useRepositoryReady } from '@/data/RepositoryProvider';
import { SettingsView } from '@/ui/SettingsView';

export default function SettingsScreen() {
  const repository = useRepository();
  const ready = useRepositoryReady();
  const router = useRouter();
  const [hiddenCount, setHiddenCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!ready) return;
      repository.listHiddenSets().then((hidden) => {
        if (!cancelled) setHiddenCount(hidden.length);
      });
      return () => {
        cancelled = true;
      };
    }, [repository, ready]),
  );

  return <SettingsView hiddenCount={hiddenCount} onOpenHiddenSets={() => router.push('/hidden-sets')} />;
}
