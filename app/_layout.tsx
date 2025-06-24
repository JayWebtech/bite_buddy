import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'ClashDisplay-Bold': require('../assets/fonts/ClashDisplay-Bold.ttf'),
    'ClashDisplay-Light': require('../assets/fonts/ClashDisplay-Light.ttf'),
    'ClashDisplay-Medium': require('../assets/fonts/ClashDisplay-Medium.ttf'),
    'ClashDisplay-Regular': require('../assets/fonts/ClashDisplay-Regular.ttf'),
    'ClashDisplay-Semibold': require('../assets/fonts/ClashDisplay-Semibold.ttf'),
    'SamuraiBlast': require('../assets/fonts/SamuraiBlast-YznGj.ttf'),
    'KnightWarrior': require('../assets/fonts/KnightWarrior-w16n8.otf'),
    'GardionDemo': require('../assets/fonts/GardionDemo-rveyK.otf'),
    'Blockblueprint': require('../assets/fonts/Blockblueprint-LV7z5.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(game)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
