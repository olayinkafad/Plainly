import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { View, ActivityIndicator } from 'react-native'
import { themeLight } from '../constants/theme'
import { AudioPlayerProvider } from '../contexts/AudioPlayerContext'
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold'
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold'
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular'
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium'
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold'
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold'

// Keep the splash screen visible while we load fonts
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  // Log font errors for debugging
  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError)
      // Still hide splash screen even if fonts fail, but log the error
      SplashScreen.hideAsync()
    }
  }, [fontError])

      // Don't render screens until fonts are loaded (or failed)
      if (!fontsLoaded && !fontError) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeLight.bgPrimary }}>
            <ActivityIndicator size="large" color={themeLight.accent} />
          </View>
        )
      }

  return (
    <SafeAreaProvider>
      <AudioPlayerProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AudioPlayerProvider>
    </SafeAreaProvider>
  )
}
