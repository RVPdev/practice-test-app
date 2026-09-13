import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { Screen } from '@/ui/Screen';
import { RunnerView } from '@/ui/RunnerView';
import { useConfirm } from '@/ui/ConfirmProvider';
import { useSessionRunner } from '@/ui/useSessionRunner';

export default function SessionScreen() {
  const router = useRouter();
  const runner = useSessionRunner();
  const confirm = useConfirm();

  // Navigate on the write completing, not on the reducer flipping to `submitted` - the
  // results screen reads the attempt back, so it must already be on disk.
  const finishedAttemptId = runner.finishedAttemptId;
  useEffect(() => {
    if (finishedAttemptId) {
      router.replace(`/results/${encodeURIComponent(finishedAttemptId)}`);
    }
  }, [finishedAttemptId, router]);

  const confirmSubmit = () => {
    if (!runner.state) return;
    if (runner.state.mode === 'practice') {
      runner.submit();
      return;
    }
    const unanswered = runner.state.questionIds.filter(
      (id) => (runner.state!.answers[id] ?? []).length === 0,
    ).length;
    confirm(
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
      itemOrder={runner.itemOrder}
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
