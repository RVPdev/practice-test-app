import { StyleSheet, View } from 'react-native';
import { radius, spacing, useTheme } from './theme';

export function ProgressBar({
  fraction,
  tone = 'highlight',
  testID,
}: {
  fraction: number;
  tone?: 'highlight' | 'positive' | 'negative';
  testID?: string;
}) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  const color =
    tone === 'positive' ? theme.positive : tone === 'negative' ? theme.negative : theme.highlight;

  return (
    <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
      <View testID={testID} style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: spacing.sm, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
