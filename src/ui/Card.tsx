import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { radius, spacing, useTheme } from './theme';

export function Card({
  children,
  onPress,
  testID,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  testID?: string;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const base = [
    styles.card,
    { backgroundColor: theme.surface, borderColor: theme.border },
    style,
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={base}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [...base, { opacity: pressed ? 0.9 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
});
