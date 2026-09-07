import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Text } from 'react-native';
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

  const confirmSubmit = () => {
    if (!runner.state) return;
    if (runner.state.mode === 'practice') {
      runner.submit();
      return;
    }
    const unanswered = runner.state.questionIds.filter(
      (id) => (runner.state!.answers[id] ?? []).length === 0,
    ).length;
    Alert.alert(
      'Submit the test?',
      unanswered > 0
        ? `${unanswered} question(s) are unanswered and will be marked incorrect.`
        : 'You have answered every question.',
      [
        { text: 'Keep working', style: 'cancel' },
        { text: 'Submit', style: 'destructive', onPress: runner.submit },
      ],
    );
  };

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
      onGoto={runner.goto}
      onSubmit={confirmSubmit}
    />
  );
}
