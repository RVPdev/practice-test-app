import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Text } from 'react-native';
import { resolveRunConfig } from '@/core/config';
import type { QuestionSet } from '@/core/schema';
import { startSession } from '@/core/session';
import { randomSeed } from '@/core/shuffle';
import type { Attempt, RunMode, RunOverrides } from '@/core/types';
import { exportSet } from '@/data/exportSet';
import { useRepository } from '@/data/RepositoryProvider';
import type { SetSource } from '@/data/repository';
import { Screen } from '@/ui/Screen';
import { SetDetailView } from '@/ui/SetDetailView';

export default function SetDetailScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const repository = useRepository();
  const router = useRouter();
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [deletable, setDeletable] = useState(false);
  const [source, setSource] = useState<SetSource | null>(null);

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
        const matched = summaries.find((s) => s.id === setId);
        setDeletable(matched?.source === 'imported');
        setSource(matched?.source ?? null);
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
    const existing = await repository.getInProgress();
    if (existing) {
      Alert.alert(
        'Discard your unfinished attempt?',
        'You can only have one attempt in progress at a time.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard and start', style: 'destructive', onPress: () => void begin(mode, overrides) },
        ],
      );
      return;
    }
    await begin(mode, overrides);
  };

  const begin = async (mode: RunMode, overrides: RunOverrides) => {
    const config = resolveRunConfig(set, mode, overrides, randomSeed());
    const session = startSession(set, mode, config, Date.now());
    await repository.saveInProgress(session);
    router.push(`/session/${encodeURIComponent(session.attemptId)}`);
  };

  const exportCurrentSet = async () => {
    try {
      await exportSet(set, source ?? 'bundled');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      Alert.alert('Could not export this set', detail);
    }
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
      onEdit={deletable ? () => router.push(`/builder/${encodeURIComponent(set.id)}`) : undefined}
      onExport={deletable ? exportCurrentSet : undefined}
      onOpenAttempt={(attemptId) => router.push(`/results/${encodeURIComponent(attemptId)}`)}
    />
  );
}
