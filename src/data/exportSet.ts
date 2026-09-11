// src/data/exportSet.ts
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import type { QuestionSet } from '@/core/schema';
import type { SetSource } from './repository';

export function buildExportPayload(
  set: QuestionSet,
  source: SetSource,
): { filename: string; json: string } {
  if (source === 'bundled') {
    throw new Error(`"${set.title}" is a bundled set and cannot be exported`);
  }
  return { filename: `${set.id}.json`, json: JSON.stringify(set, null, 2) };
}

function downloadOnWeb(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function shareOnNative(filename: string, json: string, title: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: title });
}

export async function exportSet(set: QuestionSet, source: SetSource): Promise<void> {
  const { filename, json } = buildExportPayload(set, source);
  if (Platform.OS === 'web') {
    downloadOnWeb(filename, json);
    return;
  }
  await shareOnNative(filename, json, set.title);
}
