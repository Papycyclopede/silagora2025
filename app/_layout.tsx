// app/_layout.tsx
import 'intl-pluralrules';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady'; // Assurez-vous que ce hook est correct
import { useFonts } from 'expo-font';
import {
  Satisfy_400Regular,
} from '@expo-google-fonts/satisfy';
import {
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
} from '@expo-google-fonts/quicksand';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AudioProvider } from '@/contexts/AudioContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { SouffleProvider } from '@/contexts/SouffleContext';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Satisfy-Regular': Satisfy_400Regular,
    'Quicksand-Light': Quicksand_300Light,
    'Quicksland-Regular': Quicksand_400Regular, // Correction possible typo Quicksland -> Quicksand
    'Quicksand-Medium': Quicksand_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <LanguageProvider>
      <AuthProvider>
        <AudioProvider>
          <LocationProvider>
            <SouffleProvider>
              {/* Le +initial.tsx (votre splash screen) doit être ici pour accéder aux contextes */}
              <Stack screenOptions={{ headerShown: false }}>
                {/* L'écran d'initialisation est désormais une route normale dans la stack */}
                <Stack.Screen name="_initial" /> {/* S'assure que _initial est le premier écran */}
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </SouffleProvider>
          </LocationProvider>
        </AudioProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}