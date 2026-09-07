import { StyleSheet, View } from 'react-native';
import { radius, spacing, useTheme } from './theme';

export function ProgressBar({
  fraction,
  tone = 'accent',
}: {
  fraction: number;
  tone?: 'accent' | 'positive' | 'negative';
}) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  const color =
    tone === 'positive' ? theme.positive : tone === 'negative' ? theme.negative : theme.accent;

  return (
    <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: spacing.sm, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
