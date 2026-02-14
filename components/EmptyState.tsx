import { useState, useEffect } from 'react'
import { View, Text, Animated } from 'react-native'
import Icon from './Icon'
import { themeLight } from '../constants/theme'
import Button from './Button'
import { cn } from '../lib/utils'

interface EmptyStateProps {
  onRecord: () => void
  onUpload: () => void
}

export default function EmptyState({ onRecord, onUpload }: EmptyStateProps) {
  const [isVisible, setIsVisible] = useState(false)
  const fadeAnim = new Animated.Value(0)
  const slideAnim = new Animated.Value(8)

  useEffect(() => {
    setIsVisible(true)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <View className={cn('flex-1', isVisible ? 'opacity-100' : 'opacity-0')}>
      {/* Headline */}
      <View className="pb-6">
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text className="text-xl font-semibold text-text-primary mb-3">
            Record your first voice note
          </Text>
        </Animated.View>
      </View>

      {/* Illustration */}
      <View className="flex-1 items-center justify-center min-h-0 pb-8">
        <Animated.View
          className="w-full max-w-xs mx-auto"
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View className="bg-bg-secondary rounded-lg p-8 border border-border-subtle">
            <View className="flex-row items-center justify-center gap-6 h-32">
              <View className="items-center">
                <Icon name="microphone" size={48} color="#9CA3AF" />
                <View className="w-8 h-0.5 bg-border-default mt-2" />
              </View>
              <View className="items-center gap-1">
                <View className="w-2 h-2 rounded-full bg-text-tertiary" />
                <View className="w-2 h-2 rounded-full bg-text-tertiary" />
                <View className="w-2 h-2 rounded-full bg-text-tertiary" />
              </View>
              <View className="items-center">
                <View className="w-8 h-0.5 bg-border-default mb-2" />
                <Icon name="file-text" size={48} color="#9CA3AF" />
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Actions */}
      <View className="gap-3 pb-8">
        <Button variant="primary" fullWidth onPress={onRecord}>
          <Icon name="microphone" size={20} color="white" />
          <Text className="text-white">Record</Text>
        </Button>
        <Button variant="secondary" fullWidth onPress={onUpload}>
          <Icon name="upload" size={20} color={themeLight.textPrimary} />
          <Text className="text-text-primary">Upload recording</Text>
        </Button>
      </View>
    </View>
  )
}
