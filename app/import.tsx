import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';
import { parseSetFile, type ValidationError } from '@/core/validate';
import { useRepository } from '@/data/RepositoryProvider';
import { useConfirm } from '@/ui/ConfirmProvider';
import { ImportView } from '@/ui/ImportView';

async function readFile(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return response.text();
  }
  // The root export's `readAsStringAsync` is a deprecated shim that throws at runtime in
  // SDK 57 - the modern `File` class is the supported native read path.
  return new File(uri).text();
}

export default function ImportScreen() {
  const repository = useRepository();
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [importedTitle, setImportedTitle] = useState<string | null>(null);

  const pick = async () => {
    setBusy(true);
    setErrors(null);
    setImportedTitle(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;

      const text = await readFile(picked.assets[0].uri);
      const result = parseSetFile(text);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }

      const existing = await repository.getSet(result.set.id);
      if (!existing) {
        await repository.saveSet(result.set, 'imported');
        setImportedTitle(result.set.title);
        return;
      }

      confirm(
        'You already have this set',
        `"${existing.title}" is already in your library.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            onPress: async () => {
              await repository.saveSet(result.set, 'imported', 'replace');
              setImportedTitle(result.set.title);
            },
          },
          {
            text: 'Import as copy',
            onPress: async () => {
              await repository.saveSet(result.set, 'imported', 'copy');
              setImportedTitle(result.set.title);
            },
          },
        ],
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setErrors([{ location: 'File', message: `could not read the file (${detail})` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ImportView
      busy={busy}
      errors={errors}
      importedTitle={importedTitle}
      onPick={pick}
      onDone={() => router.back()}
    />
  );
}
