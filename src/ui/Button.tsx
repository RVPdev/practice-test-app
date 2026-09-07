import { Pressable, StyleSheet, Text } from 'react-native';
import { radius, spacing, type, useTheme, type Theme } from './theme';

type Variant = 'primary' | 'secondary' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const { background, text, border } = tone(theme, variant);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[type.label, { color: text }]}>{title}</Text>
    </Pressable>
  );
}

function tone(theme: Theme, variant: Variant) {
  if (variant === 'primary') {
    return { background: theme.accent, text: theme.accentText, border: theme.accent };
  }
  if (variant === 'danger') {
    return { background: theme.negativeSurface, text: theme.negative, border: theme.negative };
  }
  return { background: theme.surface, text: theme.text, border: theme.border };
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
