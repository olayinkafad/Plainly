import { useState, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  AccessibilityInfo,
  Text,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Button from '../components/Button'
import OnboardingWaveform from '../components/OnboardingWaveform'
import OnboardingResultPreview from '../components/OnboardingResultPreview'
import OnboardingUseCaseCards from '../components/OnboardingUseCaseCards'
import { themeLight } from '../constants/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// Fixed spacing (same on all 3 screens)
const GAP_TOP_TO_ILLUSTRATION = 16
const GAP_ILLUSTRATION_TO_HEADING = 24
const GAP_HEADING_TO_SUBTEXT = 8
const GAP_SUBTEXT_TO_DOTS = 24
const GAP_DOTS_TO_BUTTON = 16
const GAP_BUTTON_TO_BOTTOM = 32

// Illustration 45% of screen so heading/subtext/dots/button sit in same place
const ILLUSTRATION_HEIGHT = Math.round(SCREEN_HEIGHT * 0.45)

// Fixed slide content height so heading/body/dots align across all screens
const SLIDE_CONTENT_HEIGHT =
  GAP_TOP_TO_ILLUSTRATION +
  ILLUSTRATION_HEIGHT +
  GAP_ILLUSTRATION_TO_HEADING +
  90 + // title ~2 lines
  GAP_HEADING_TO_SUBTEXT +
  65 + // body ~3 lines
  GAP_SUBTEXT_TO_DOTS

interface Slide {
  title: string
  body: string
  illustration: 'waveform' | 'resultPreview' | 'useCaseCards'
}

const slides: Slide[] = [
  {
    title: "Just talk. We'll handle the rest.",
    body: 'Record your thoughts and get back clear, structured notes.',
    illustration: 'waveform',
  },
  {
    title: 'Talk messy. Get clean notes.',
    body: "Plainly transcribes what you said and pulls out what matters.",
    illustration: 'resultPreview',
  },
  {
    title: 'For meetings, ideas, and everything in between.',
    body: "Whenever you'd rather talk than type.",
    illustration: 'useCaseCards',
  },
]

export default function Onboarding() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setPrefersReducedMotion)
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setPrefersReducedMotion
    )
    return () => subscription.remove()
  }, [])

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(offsetX / SCREEN_WIDTH)
    if (index >= 0 && index < slides.length && index !== currentIndex) {
      setCurrentIndex(index)
    }
  }

  const renderIllustration = (item: Slide, slideIndex: number) => {
    if (item.illustration === 'waveform') {
      return (
        <View style={styles.illustrationWrapper}>
          <OnboardingWaveform />
        </View>
      )
    }
    if (item.illustration === 'resultPreview') {
      return (
        <View style={styles.illustrationWrapper}>
          <OnboardingResultPreview isFocused={currentIndex === 1} />
        </View>
      )
    }
    return (
      <View style={styles.illustrationWrapper}>
        <OnboardingUseCaseCards />
      </View>
    )
  }

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <View style={styles.slideContainer}>
      <View style={styles.slide}>
        {/* 1. Top padding */}
        <View style={{ height: GAP_TOP_TO_ILLUSTRATION }} />
        {/* 2. Illustration area – 45% height, single background */}
        <View style={[styles.illustrationArea, { height: ILLUSTRATION_HEIGHT }]}>
          {renderIllustration(item, index)}
        </View>
        {/* 3. Illustration → heading */}
        <View style={{ height: GAP_ILLUSTRATION_TO_HEADING }} />
        {/* 4. Heading – Playfair Display 700, 28px (onboarding test only) */}
        <Text style={styles.title}>{item.title}</Text>
        {/* 5. Heading → subtext */}
        <View style={{ height: GAP_HEADING_TO_SUBTEXT }} />
        {/* 6. Subtext – Plus Jakarta Sans 400, 15px (onboarding test only) */}
        <Text style={styles.body}>{item.body}</Text>
        {/* 7. Subtext → dots (same as illustration → heading) */}
        <View style={{ height: GAP_SUBTEXT_TO_DOTS }} />
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(_, index) => `slide-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="start"
          disableIntervalMomentum
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          style={styles.flatList}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          contentContainerStyle={styles.flatListContent}
        />

        {/* Pagination dots – pinned at bottom, centered */}
        <View style={styles.progressContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentIndex && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Dots → button: 16px; button → bottom: 32px */}
        <View style={[styles.bottomZone, { paddingBottom: insets.bottom + GAP_BUTTON_TO_BOTTOM }]}>
          <Button
            variant="primary"
            fullWidth
            onPress={() => router.replace('/home')}
          >
            <Text style={styles.getStartedButtonText}>Get started</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeLight.bgPrimary,
  },
  content: {
    flex: 1,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  flatList: {
    height: SLIDE_CONTENT_HEIGHT,
  },
  flatListContent: {},
  slideContainer: {
    width: SCREEN_WIDTH,
    height: SLIDE_CONTENT_HEIGHT,
  },
  slide: {
    paddingHorizontal: 20,
  },
  /* Illustration – warm cream background */
  illustrationArea: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: themeLight.bgSecondary,
  },
  illustrationWrapper: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Onboarding test typography: Playfair Display 700, 28px */
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    textAlign: 'center',
    color: themeLight.textPrimary,
  },
  /* Onboarding test typography: Plus Jakarta Sans 400, 15px */
  body: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    textAlign: 'center',
    color: themeLight.textSecondary,
  },
  /* Get started button text: Plus Jakarta Sans 600 (onboarding test only) */
  getStartedButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: themeLight.textInverse,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 0,
    paddingBottom: GAP_DOTS_TO_BUTTON,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeLight.tabInactiveBg,
  },
  progressDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeLight.accent,
  },
  bottomZone: {
    paddingHorizontal: 16,
    paddingTop: 0,
    width: '100%',
  },
})
