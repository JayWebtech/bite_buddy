import { Stack } from 'expo-router';

export default function GameLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="meal-scan" options={{ headerShown: false }} />
      <Stack.Screen name="battle-arena" options={{ headerShown: false }} />
    </Stack>
  );
} 