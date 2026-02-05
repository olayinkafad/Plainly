import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Button from './Button'
import { cn } from '../lib/utils'


export default function LaunchScreen() {
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const fadeAnim = new Animated.Value(0)

  useEffect(() => {
    setIsVisible(true)
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [])

  const handleGetStarted = () => {
    router.push('/onboarding')
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <Animated.View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', opacity: fadeAnim }}
      >
        {/* Top section - Logo only */}
        <View className="w-full max-w-sm pt-6">
          <View className="items-center">
            {/* App Logo - Simple, minimal */}
            <View className="w-16 h-16 rounded-md bg-accent-primary items-center justify-center">
              <Text className="text-white text-xl font-semibold">P</Text>
            </View>
          </View>
        </View>

        {/* Middle section - Title and subtext centered */}
        <View className="flex-1 items-center justify-center w-full max-w-sm">
          <View className="items-center gap-6">
            {/* Title */}
            <Text className="text-xl font-semibold text-text-primary text-center">
              Say it out loud.
            </Text>

            {/* Subtext */}
            <Text className="text-sm text-text-secondary text-center">
              Plainly helps you turn spoken thoughts into structured clarity, instantly!
            </Text>
          </View>
        </View>

        {/* Bottom section - primary action and reassurance */}
        <View className="w-full max-w-sm gap-3">
          {/* Primary button */}
          <Button variant="primary" fullWidth onPress={handleGetStarted}>
            <Text className="text-white font-medium">Get started</Text>
          </Button>

          {/* Reassurance text - small, low-emphasis */}
          <Text className="text-xs text-text-tertiary text-center">
            No sign-up required
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  )
}
