import { useState, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  AccessibilityInfo,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Title, Body } from '../components/typography'
import Button from '../components/Button'
import OnboardingWaveform from '../components/OnboardingWaveform'
import OnboardingResultPreview from '../components/OnboardingResultPreview'
import OnboardingUseCaseCards from '../components/OnboardingUseCaseCards'

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
        {/* 2. Illustration area – 45% height, content centered */}
        <View style={[styles.illustrationArea, { height: ILLUSTRATION_HEIGHT }]}>
          {renderIllustration(item, index)}
        </View>
        {/* 3. Illustration → heading */}
        <View style={{ height: GAP_ILLUSTRATION_TO_HEADING }} />
        {/* 4. Heading */}
        <Title style={styles.title}>{item.title}</Title>
        {/* 5. Heading → subtext */}
        <View style={{ height: GAP_HEADING_TO_SUBTEXT }} />
        {/* 6. Subtext */}
        <Body style={styles.body}>{item.body}</Body>
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
            Get started
          </Button>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  /* Illustration – height set inline (45% of screen), content centered */
  illustrationArea: {
    width: '100%',
    backgroundColor: '#EEF3FF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationWrapper: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Heading – Satoshi-Bold from assets, 28–30pt */
  title: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 29,
    textAlign: 'center',
    color: '#111827',
  },
  /* Subtext – Satoshi-Regular from assets */
  body: {
    fontFamily: 'Satoshi-Regular',
    textAlign: 'center',
    color: '#6B7280',
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
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  bottomZone: {
    paddingHorizontal: 16,
    paddingTop: 0,
    width: '100%',
  },
})
