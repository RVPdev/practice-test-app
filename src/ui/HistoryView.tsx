import { ActivityIndicator, Text, View } from 'react-native';
import type { Attempt } from '@/core/types';
import { Card } from './Card';
import { formatDate, formatPercent } from './format';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function HistoryView({
  attempts,
  setTitles,
  loading,
  onOpenAttempt,
}: {
  attempts: Attempt[];
  setTitles: Record<string, string>;
  loading: boolean;
  onOpenAttempt: (attemptId: string) => void;
}) {
  const theme = useTheme();

  return (
    <Screen>
      <Text style={[type.title, { color: theme.text }]}>History</Text>

      {loading ? (
        <ActivityIndicator testID="history-loading" />
      ) : attempts.length === 0 ? (
        <Card>
          <Text style={[type.body, { color: theme.text }]}>No attempts yet.</Text>
          <Text style={[type.caption, { color: theme.textMuted }]}>
            Finish a mock test or a practice run and it will show up here.
          </Text>
        </Card>
      ) : (
        attempts.map((item) => (
          <Card key={item.id} testID={`history-${item.id}`} onPress={() => onOpenAttempt(item.id)}>
            <Text style={[type.heading, { color: theme.text }]}>
              {setTitles[item.setId] ?? item.setId}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Text style={[type.caption, { color: theme.textMuted, flex: 1 }]}>
                {`${item.mode === 'mock' ? 'Mock test' : 'Practice'} · ${formatDate(item.finishedAt)}`}
              </Text>
              <Text
                style={[
                  type.label,
                  { color: item.mode === 'mock' && !item.score.passed ? theme.negative : theme.text },
                ]}
              >
                {formatPercent(item.score.percent)}
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
