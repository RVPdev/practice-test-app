// app/builder/[setId].tsx
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import type { QuestionSet } from '@/core/schema';
import { validateSet, type ValidationError } from '@/core/validate';
import { useRepository } from '@/data/RepositoryProvider';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { SetBuilderView } from '@/ui/SetBuilderView';

export default function EditSetScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const repository = useRepository();
  const router = useRouter();
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [editable, setEditable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([repository.getSet(setId), repository.listSets()]).then(([loadedSet, summaries]) => {
        if (cancelled) return;
        setSet(loadedSet);
        setEditable(summaries.find((s) => s.id === setId)?.source === 'imported');
        setLoaded(true);
      });
      return () => {
        cancelled = true;
      };
    }, [repository, setId]),
  );

  const save = async (updated: QuestionSet) => {
    setSaving(true);
    setErrors(null);
    const result = validateSet(updated);
    if (!result.ok) {
      setErrors(result.errors);
      setSaving(false);
      return;
    }
    await repository.saveSet(result.set, 'imported', 'replace');
    setSaving(false);
    router.back();
  };

  if (!loaded) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }

  if (!set || !editable) {
    return (
      <Screen>
        <Text>This set can&apos;t be edited.</Text>
        <Button title="Go back" onPress={() => router.back()} testID="builder-blocked-back" />
      </Screen>
    );
  }

  return (
    <SetBuilderView initialSet={set} errors={errors} saving={saving} onSave={save} onCancel={() => router.back()} />
  );
}
