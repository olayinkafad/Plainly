import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { View, ActivityIndicator } from 'react-native'
import { themeLight } from '../constants/theme'

// Keep the splash screen visible while we load fonts
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Satoshi-Regular': require('../assets/Fonts/OTF/Satoshi-Regular.otf'),
    'Satoshi-Medium': require('../assets/Fonts/OTF/Satoshi-Medium.otf'),
    'Satoshi-Bold': require('../assets/Fonts/OTF/Satoshi-Bold.otf'),
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
