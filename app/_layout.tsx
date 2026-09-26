import { Stack, usePathname } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ConsentGate } from '@/ui/ConsentGate';
import { ConfirmProvider } from '@/ui/ConfirmProvider';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { ThemeModeProvider } from '@/ui/ThemeModeProvider';
import { useTheme } from '@/ui/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function useBlurOnNavigateWeb() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [pathname]);
}

function AppRoot() {
  useBlurOnNavigateWeb();
  const theme = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RepositoryProvider>
        <ConfirmProvider>
          <ConsentGate>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: theme.surface },
                headerTintColor: theme.text,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: theme.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Library' }} />
              <Stack.Screen name="set/[setId]" options={{ title: 'Set' }} />
              <Stack.Screen name="session/[attemptId]" options={{ title: 'Session', headerBackVisible: false }} />
              <Stack.Screen name="results/[attemptId]" options={{ title: 'Results' }} />
              <Stack.Screen name="import" options={{ title: 'Import a set', presentation: 'modal' }} />
              <Stack.Screen name="builder/new" options={{ title: 'Create a set', presentation: 'modal' }} />
              <Stack.Screen name="builder/[setId]" options={{ title: 'Edit set' }} />
            </Stack>
          </ConsentGate>
        </ConfirmProvider>
      </RepositoryProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <AppRoot />
    </ThemeModeProvider>
  );
}
