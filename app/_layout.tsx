import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { View, ActivityIndicator } from 'react-native'
import { themeLight } from '../constants/theme'
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold'
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold'
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular'
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium'
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold'

// Keep the splash screen visible while we load fonts
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
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
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  )
}
