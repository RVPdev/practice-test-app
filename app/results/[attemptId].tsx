import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import type { QuestionSet } from '@/core/schema';
import type { Attempt } from '@/core/types';
import { useRepository } from '@/data/RepositoryProvider';
import { ResultsView } from '@/ui/ResultsView';
import { Screen } from '@/ui/Screen';

export default function ResultsScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const repository = useRepository();
  const router = useRouter();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [set, setSet] = useState<QuestionSet | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loadedAttempt = await repository.getAttempt(attemptId);
      const loadedSet = loadedAttempt ? await repository.getSet(loadedAttempt.setId) : null;
      if (cancelled) return;
      setAttempt(loadedAttempt);
      setSet(loadedSet);
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, attemptId]);

  if (!attempt || !set) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }

  return <ResultsView attempt={attempt} set={set} onDone={() => router.dismissAll()} />;
}
