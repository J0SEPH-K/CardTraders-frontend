import React, { useEffect, useState } from 'react';
import RootNav from './src/navigation';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Merriweather_300Light,
  Merriweather_400Regular,
  Merriweather_700Bold,
  Merriweather_900Black,
} from '@expo-google-fonts/merriweather';
import { useFonts as useLobsterFonts, LobsterTwo_400Regular } from '@expo-google-fonts/lobster-two';
import { useFonts as useCinzelFonts, Cinzel_400Regular } from '@expo-google-fonts/cinzel';
import { useFonts as useBoldonseFonts, Boldonse_400Regular } from '@expo-google-fonts/boldonse';
import { useFonts as useHahmletFonts, Hahmlet_600SemiBold } from '@expo-google-fonts/hahmlet';
import { useFonts as useDoHyeonFonts, DoHyeon_400Regular } from '@expo-google-fonts/do-hyeon';
import { useFonts as useUrbanistFonts, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold } from '@expo-google-fonts/urbanist';
import { useFonts as useGothicA1Fonts, GothicA1_400Regular } from '@expo-google-fonts/gothic-a1';
import { Text as RNText } from 'react-native';
import { loadRuntimeConfig, getConfig } from '@/config/runtime';
import { setApiBase } from '@/api/client';

export default function App() {
  const [configReady, setConfigReady] = useState(false);
  const [merriweatherLoaded] = useFonts({
    Merriweather_300Light,
    Merriweather_400Regular,
    Merriweather_700Bold,
    Merriweather_900Black,
  });
  const [lobsterLoaded] = useLobsterFonts({ LobsterTwo_400Regular });
  const [cinzelLoaded] = useCinzelFonts({ Cinzel_400Regular });
  const [boldonseLoaded] = useBoldonseFonts({ Boldonse_400Regular });
  const [hahmletLoaded] = useHahmletFonts({ Hahmlet_600SemiBold });
  const [doHyeonLoaded] = useDoHyeonFonts({ DoHyeon_400Regular });
  const [urbanistLoaded] = useUrbanistFonts({ Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold });
  const [gothicA1Loaded] = useGothicA1Fonts({ GothicA1_400Regular });
  const fontsLoaded = merriweatherLoaded && lobsterLoaded && cinzelLoaded && boldonseLoaded && hahmletLoaded && doHyeonLoaded && urbanistLoaded && gothicA1Loaded;

  useEffect(() => {
    // keep splash until fonts and config are ready
    SplashScreen.preventAutoHideAsync().catch(() => {});
  (async () => {
      try {
    await loadRuntimeConfig();
    const apiFromCfg = getConfig<string>('EXPO_PUBLIC_API');
    if (apiFromCfg) setApiBase(apiFromCfg);
      } finally {
        setConfigReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (fontsLoaded && configReady) {
      SplashScreen.hideAsync().catch(() => {});
  // apply global default font to Text
  const anyText: any = RNText as any;
  anyText.defaultProps = anyText.defaultProps || {};
  anyText.defaultProps.style = [anyText.defaultProps.style, { fontFamily: 'Merriweather_400Regular' }];
    }
  }, [fontsLoaded, configReady]);

  if (!fontsLoaded || !configReady) return null;
  return <RootNav />;
}