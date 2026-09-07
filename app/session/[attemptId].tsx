import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { Screen } from '@/ui/Screen';
import { RunnerView } from '@/ui/RunnerView';
import { useSessionRunner } from '@/ui/useSessionRunner';

export default function SessionScreen() {
  const router = useRouter();
  const runner = useSessionRunner();

  // When the session submits, the attempt has been written - go read it.
  useEffect(() => {
    if (runner.state?.status === 'submitted') {
      router.replace(`/results/${encodeURIComponent(runner.state.attemptId)}`);
    }
  }, [runner.state?.status, runner.state?.attemptId, router]);

  if (runner.loading || !runner.state || !runner.question) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }

  return (
    <RunnerView
      state={runner.state}
      question={runner.question}
      optionOrder={runner.optionOrder}
      remaining={runner.remaining}
      onAnswer={runner.answer}
      onReveal={runner.reveal}
      onNext={runner.next}
      onPrev={runner.prev}
      onSubmit={runner.submit}
    />
  );
}
