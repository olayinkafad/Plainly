import { useState, useEffect, useRef } from 'react'
import { View, Text, ScrollView, Dimensions, AccessibilityInfo } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from './Icon'
import Button from './Button'
import { cn } from '../lib/utils'

interface Slide {
  title: string
  body: string
  illustration: React.ReactNode
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const slides: Slide[] = [
  {
    title: 'Record or upload',
    body: 'Speak your thoughts out loud or upload an existing voice note.',
    illustration: (
      <View className="relative w-full max-w-xs mx-auto">
        <View className="bg-bg-secondary rounded-lg p-6 border border-border-subtle">
          <View className="items-center justify-center h-32">
            <Mic size={48} color="#9CA3AF" />
          </View>
        </View>
      </View>
    ),
  },
  {
    title: 'Choose your format',
    body: 'Pick notes, a summary, or action items.',
    illustration: (
      <View className="relative w-full max-w-xs mx-auto">
        <View className="bg-bg-secondary rounded-lg p-6 border border-border-subtle">
          <View className="gap-3">
            <View className="h-3 bg-border-default rounded w-3/4" />
            <View className="h-3 bg-border-default rounded w-full" />
            <View className="h-3 bg-border-default rounded w-5/6" />
          </View>
        </View>
      </View>
    ),
  },
  {
    title: 'See your text',
    body: "Plainly's AI turns your voice into clear, structured text.",
    illustration: (
      <View className="relative w-full max-w-xs mx-auto">
        <View className="bg-bg-secondary rounded-lg p-6 border border-border-subtle">
          <View className="items-center justify-center h-32">
            <Icon name="sparkle" size={48} color="#9CA3AF" />
          </View>
        </View>
      </View>
    ),
  },
  {
    title: 'Download or share',
    body: 'Copy, download, or share your output instantly.',
    illustration: (
      <View className="relative w-full max-w-xs mx-auto">
        <View className="bg-bg-secondary rounded-lg p-6 border border-border-subtle">
          <View className="items-center justify-center h-32">
            <Icon name="download" size={48} color="#9CA3AF" />
          </View>
        </View>
      </View>
    ),
  },
]

export default function OnboardingCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setPrefersReducedMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setPrefersReducedMotion)
    return () => subscription.remove()
  }, [])

  const startAutoAdvance = () => {
    if (autoAdvanceRef.current) {
      clearInterval(autoAdvanceRef.current)
    }
    if (prefersReducedMotion) return

    autoAdvanceRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % slides.length
        scrollViewRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: !prefersReducedMotion })
        return next
      })
    }, 3000)
  }

  useEffect(() => {
    startAutoAdvance()
    return () => {
      if (autoAdvanceRef.current) {
        clearInterval(autoAdvanceRef.current)
      }
    }
  }, [prefersReducedMotion])

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const slideIndex = Math.round(offsetX / SCREEN_WIDTH)
    if (slideIndex !== currentSlide) {
      setCurrentSlide(slideIndex)
    }
  }

  const handleStartUsing = () => {
    router.push('/home')
  }

  return (
    <View className="flex-1 bg-bg-primary">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: insets.bottom + 16,
        }}
      >
        {/* Progress indicator */}
        <View className="pt-6 pb-8">
          <View className="flex-row gap-2 w-full">
            {slides.map((_, index) => (
              <View
                key={index}
                className={cn(
                  'h-1 flex-1 rounded-sm',
                  index === currentSlide ? 'bg-accent-primary' : 'bg-border-default'
                )}
              />
            ))}
          </View>
        </View>

        {/* Carousel */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          className="flex-1"
        >
          {slides.map((slide, index) => (
            <View
              key={index}
              className="flex-1"
              style={{ width: SCREEN_WIDTH - 32 }}
            >
              {/* Header text */}
              <View className="pb-6">
                <Text className="text-xl font-semibold text-text-primary mb-3 text-left">
                  {slide.title}
                </Text>
                <Text className="text-sm text-text-secondary text-left break-words">
                  {slide.body}
                </Text>
              </View>

              {/* Illustration */}
              <View className="flex-1 items-center justify-center min-h-0 pb-8">
                {slide.illustration}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* CTA */}
        <View className="w-full pt-4">
          <Button variant="primary" fullWidth onPress={handleStartUsing}>
            <Text className="text-white font-medium">Start using Plainly</Text>
            <Icon name="arrow-right" size={20} color="white" />
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}
