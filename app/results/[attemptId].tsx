import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import type { QuestionSet } from '@/core/schema';
import type { Attempt } from '@/core/types';
import { useRepository } from '@/data/RepositoryProvider';
import { Button } from '@/ui/Button';
import { ResultsView } from '@/ui/ResultsView';
import { Screen } from '@/ui/Screen';

export default function ResultsScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const repository = useRepository();
  const router = useRouter();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const loadedAttempt = await repository.getAttempt(attemptId);
      const loadedSet = loadedAttempt ? await repository.getSet(loadedAttempt.setId) : null;
      if (cancelled) return;
      setAttempt(loadedAttempt);
      setSet(loadedSet);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, attemptId]);

  if (loading) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }

  // Loaded, but there is nothing to show - say so rather than spinning forever.
  if (!attempt || !set) {
    return (
      <Screen>
        <Text>This result is no longer available.</Text>
        <Button title="Done" onPress={() => router.dismissAll()} testID="results-missing-done" />
      </Screen>
    );
  }

  return <ResultsView attempt={attempt} set={set} onDone={() => router.dismissAll()} />;
}
