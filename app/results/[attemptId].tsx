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
  // Tagged with the id it was loaded for, so "loading" is derived rather than reset by hand.
  const [loaded, setLoaded] = useState<{
    attemptId: string;
    attempt: Attempt | null;
    set: QuestionSet | null;
  } | null>(null);
  const loading = loaded?.attemptId !== attemptId;
  const attempt = loaded?.attempt ?? null;
  const set = loaded?.set ?? null;

  const goHome = () => {
    // Only dismiss if there's a dismissable stack; otherwise navigate home directly.
    if (router.canDismiss()) {
      router.dismissAll();
    } else {
      router.replace('/');
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loadedAttempt = await repository.getAttempt(attemptId);
      const loadedSet = loadedAttempt ? await repository.getSet(loadedAttempt.setId) : null;
      if (cancelled) return;
      setLoaded({ attemptId, attempt: loadedAttempt, set: loadedSet });
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
        <Button title="Done" onPress={goHome} testID="results-missing-done" />
      </Screen>
    );
  }

  return <ResultsView attempt={attempt} set={set} onDone={goHome} />;
}
