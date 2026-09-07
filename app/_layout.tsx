import { Stack } from 'expo-router';
import { RepositoryProvider } from '@/data/RepositoryProvider';

export default function RootLayout() {
  return (
    <RepositoryProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="set/[setId]" options={{ title: 'Set' }} />
        <Stack.Screen name="session/[attemptId]" options={{ title: 'Session', headerBackVisible: false }} />
        <Stack.Screen name="results/[attemptId]" options={{ title: 'Results' }} />
        <Stack.Screen name="import" options={{ title: 'Import a set', presentation: 'modal' }} />
      </Stack>
    </RepositoryProvider>
  );
}
