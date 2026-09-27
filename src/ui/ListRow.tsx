import { Pressable, View, type ViewStyle } from 'react-native';
import { spacing, useTheme } from './theme';

export function ListRow({
  children,
  onPress,
  testID,
  isLast = false,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  testID?: string;
  isLast?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const base = [
    { padding: spacing.md, gap: spacing.xs },
    !isLast ? { borderBottomWidth: 1, borderBottomColor: theme.border } : null,
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
