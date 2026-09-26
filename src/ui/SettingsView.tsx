import { Text, View } from 'react-native';
import { Button } from './Button';
import { Screen } from './Screen';
import { type ThemeMode, useThemeMode } from './ThemeModeProvider';
import { spacing, type, useTheme } from './theme';

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
  { mode: 'system', label: 'System' },
];

export function SettingsView() {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();

  return (
    <Screen>
      <Text style={[type.title, { color: theme.text }]}>Settings</Text>
      <Text style={[type.label, { color: theme.textMuted }]}>Theme</Text>
      <View style={{ gap: spacing.sm }}>
        {OPTIONS.map((option) => (
          <Button
            key={option.mode}
            title={option.label}
            variant={mode === option.mode ? 'primary' : 'secondary'}
            onPress={() => setMode(option.mode)}
            testID={`theme-mode-${option.mode}`}
          />
        ))}
      </View>
    </Screen>
  );
}
