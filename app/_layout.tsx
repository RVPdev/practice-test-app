import { Stack } from 'expo-router';
import { ConsentGate } from '@/ui/ConsentGate';
import { ConfirmProvider } from '@/ui/ConfirmProvider';
import { RepositoryProvider } from '@/data/RepositoryProvider';

export default function RootLayout() {
  return (
    <RepositoryProvider>
      <ConfirmProvider>
        <ConsentGate>
          <Stack>
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
