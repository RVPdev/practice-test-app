// app/builder/new.tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { QuestionSet } from '@/core/schema';
import { validateSet, type ValidationError } from '@/core/validate';
import { useRepository } from '@/data/RepositoryProvider';
import { SetBuilderView } from '@/ui/SetBuilderView';

export default function NewSetScreen() {
  const repository = useRepository();
  const router = useRouter();
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (set: QuestionSet) => {
    setSaving(true);
    setErrors(null);
    const result = validateSet(set);
    if (!result.ok) {
      setErrors(result.errors);
      setSaving(false);
      return;
    }
    await repository.saveSet(result.set, 'imported');
    setSaving(false);
    router.back();
  };

  return (
    <SetBuilderView initialSet={null} errors={errors} saving={saving} onSave={save} onCancel={() => router.back()} />
  );
}
