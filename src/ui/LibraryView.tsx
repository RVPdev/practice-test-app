import { ActivityIndicator, Text, View } from 'react-native';
import type { SetSummary } from '@/data/repository';
import { Button } from './Button';
import { Card } from './Card';
import { formatDate, formatPercent } from './format';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function LibraryView({
  sets,
  loading,
  onOpenSet,
  onImport,
}: {
  sets: SetSummary[];
  loading: boolean;
  onOpenSet: (setId: string) => void;
  onImport: () => void;
}) {
  const theme = useTheme();

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <Text style={[type.title, { color: theme.text }]}>Question sets</Text>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          Pick a set to practise, or import your own JSON.
        </Text>
      </View>

      <Button title="Import a set" onPress={onImport} variant="secondary" testID="import-button" />

      {loading ? (
        <ActivityIndicator testID="library-loading" />
      ) : sets.length === 0 ? (
        <Card>
          <Text style={[type.body, { color: theme.text }]}>No question sets yet.</Text>
          <Text style={[type.caption, { color: theme.textMuted }]}>
            Import a JSON file to get started.
          </Text>
        </Card>
      ) : (
        sets.map((set) => (
          <Card key={set.id} testID={`set-card-${set.id}`} onPress={() => onOpenSet(set.id)}>
            <Text style={[type.heading, { color: theme.text }]}>{set.title}</Text>
            {set.description ? (
              <Text style={[type.caption, { color: theme.textMuted }]} numberOfLines={2}>
                {set.description}
              </Text>
            ) : null}
            <Text style={[type.caption, { color: theme.textMuted }]}>
              {`${set.questionCount} questions · ${set.topicCount} topics`}
            </Text>
            {set.attemptCount > 0 && set.bestPercent !== null ? (
              <Text style={[type.caption, { color: theme.textMuted }]}>
                {`Best ${formatPercent(set.bestPercent)} · last ${formatDate(set.lastAttemptAt ?? '')}`}
              </Text>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
