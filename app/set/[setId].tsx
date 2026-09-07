import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Text } from 'react-native';
import { resolveRunConfig } from '@/core/config';
import type { QuestionSet } from '@/core/schema';
import { startSession } from '@/core/session';
import { randomSeed } from '@/core/shuffle';
import type { Attempt, RunMode, RunOverrides } from '@/core/types';
import { useRepository } from '@/data/RepositoryProvider';
import { Screen } from '@/ui/Screen';
import { SetDetailView } from '@/ui/SetDetailView';

export default function SetDetailScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const repository = useRepository();
  const router = useRouter();
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [deletable, setDeletable] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        repository.getSet(setId),
        repository.listAttempts(setId),
        repository.listSets(),
      ]).then(([loadedSet, loadedAttempts, summaries]) => {
        if (cancelled) return;
        setSet(loadedSet);
        setAttempts(loadedAttempts);
        setDeletable(summaries.find((s) => s.id === setId)?.source === 'imported');
      });
      return () => {
        cancelled = true;
      };
    }, [repository, setId]),
  );

  if (!set) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }

  const start = async (mode: RunMode, overrides: RunOverrides) => {
    const config = resolveRunConfig(set, mode, overrides, randomSeed());
    const session = startSession(set, mode, config, Date.now());
    await repository.saveInProgress(session);
    router.push(`/session/${encodeURIComponent(session.attemptId)}`);
  };

  const remove = () => {
    Alert.alert(
      'Delete this set?',
      `"${set.title}" and its ${attempts.length} attempt(s) will be removed from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await repository.deleteSet(set.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <SetDetailView
      set={set}
      attempts={attempts}
      onStart={start}
      onDelete={deletable ? remove : undefined}
      onOpenAttempt={(attemptId) => router.push(`/results/${encodeURIComponent(attemptId)}`)}
    />
  );
}
