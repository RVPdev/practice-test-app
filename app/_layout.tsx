import { Stack, usePathname } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { ConsentGate } from '@/ui/ConsentGate';
import { ConfirmProvider } from '@/ui/ConfirmProvider';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { useTheme } from '@/ui/theme';

// react-navigation's web renderer marks the outgoing screen aria-hidden as
// soon as a route changes, but never blurs whatever element still has DOM
// focus inside it (e.g. the button that was pressed to trigger the
// navigation) - Chrome then warns "Blocked aria-hidden on an element
// because its descendant retained focus". Do the blur ourselves.
function useBlurOnNavigateWeb() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [pathname]);
}

export default function RootLayout() {
  useBlurOnNavigateWeb();
  const theme = useTheme();
  return (
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
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
  );
}
