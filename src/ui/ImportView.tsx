import { Text, View } from 'react-native';
import type { ValidationError } from '@/core/validate';
import { Button } from './Button';
import { Card } from './Card';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function ImportView({
  busy,
  errors,
  importedTitle,
  onPick,
  onDone,
}: {
  busy: boolean;
  errors: ValidationError[] | null;
  importedTitle: string | null;
  onPick: () => void;
  onDone: () => void;
}) {
  const theme = useTheme();

  return (
    <Screen>
      <Text style={[type.title, { color: theme.text }]}>Import a question set</Text>
      <Text style={[type.caption, { color: theme.textMuted }]}>
        Choose a .json file that follows the question set format. The whole file is checked
        before anything is saved.
      </Text>

      <Button
        title={busy ? 'Reading…' : 'Choose a file'}
        onPress={onPick}
        disabled={busy}
        testID="pick-file"
      />

      {errors && errors.length > 0 ? (
        <Card testID="import-errors">
          <Text style={[type.heading, { color: theme.negative }]}>
            {`${errors.length} problem${errors.length === 1 ? '' : 's'} found`}
          </Text>
          <Text style={[type.caption, { color: theme.textMuted }]}>
            Nothing was imported. Fix the file and try again.
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {errors.map((error, index) => (
              <View key={`${error.location}-${index}`}>
                <Text style={[type.label, { color: theme.text }]}>{error.location}</Text>
                <Text style={[type.caption, { color: theme.textMuted }]}>{error.message}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {importedTitle ? (
        <Card testID="import-success">
          <Text style={[type.body, { color: theme.positive }]}>{`Imported "${importedTitle}".`}</Text>
          <Button title="Done" onPress={onDone} testID="import-done" />
        </Card>
      ) : null}
    </Screen>
  );
}
