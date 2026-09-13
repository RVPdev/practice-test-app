import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import type { RunMode } from '@/core/types';
import { useRepository, useRepositoryReady } from '@/data/RepositoryProvider';
import type { SetSummary } from '@/data/repository';
import { useConfirm } from '@/ui/ConfirmProvider';
import { LibraryView } from '@/ui/LibraryView';

export default function LibraryScreen() {
  const repository = useRepository();
  const ready = useRepositoryReady();
  const router = useRouter();
  const confirm = useConfirm();
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [inProgress, setInProgress] = useState<{
    attemptId: string;
    setTitle: string;
    mode: RunMode;
  } | null>(null);

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
      repository.getInProgress().then(async (session) => {
        if (cancelled || !session) {
          if (!cancelled) setInProgress(null);
          return;
        }
        const set = await repository.getSet(session.setId);
        if (cancelled) return;
        setInProgress({
          attemptId: session.attemptId,
          setTitle: set?.title ?? session.setId,
          mode: session.mode,
        });
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
      onCreate={() => router.push('/builder/new')}
      inProgress={inProgress}
      onResume={
        inProgress
          ? () => router.push(`/session/${encodeURIComponent(inProgress.attemptId)}`)
          : undefined
      }
      onDiscard={() => {
        confirm('Discard this attempt?', 'Your progress will be lost.', [
          { text: 'Keep it', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await repository.saveInProgress(null);
              setInProgress(null);
            },
          },
        ]);
      }}
    />
  );
}
