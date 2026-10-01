import { ActivityIndicator, Text, View } from 'react-native';
import type { SetSummary } from '@/data/repository';
import { Button } from './Button';
import { Card } from './Card';
import { ListRow } from './ListRow';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function HiddenSetsView({
  sets,
  loading,
  onRestore,
}: {
  sets: SetSummary[];
  loading: boolean;
  onRestore: (setId: string) => void;
}) {
  const theme = useTheme();

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <Text style={[type.title, { color: theme.text }]}>Hidden exams</Text>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          Free exams you&apos;ve hidden from your library. Restoring brings back their attempt history too.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator testID="hidden-sets-loading" />
      ) : sets.length === 0 ? (
        <Card>
          <Text style={[type.body, { color: theme.text }]}>No hidden exams.</Text>
        </Card>
      ) : (
        <Card>
          {sets.map((set, index) => (
            <ListRow key={set.id} testID={`hidden-set-${set.id}`} isLast={index === sets.length - 1}>
              <Text style={[type.heading, { color: theme.text }]}>{set.title}</Text>
              <Text style={[type.caption, { color: theme.textMuted }]}>{`${set.questionCount} questions`}</Text>
              <Button
                title="Restore"
                variant="secondary"
                onPress={() => onRestore(set.id)}
                testID={`restore-set-${set.id}`}
              />
            </ListRow>
          ))}
        </Card>
      )}
    </Screen>
  );
}
