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
        {/* 1. Illustration area – top, dominant (~2/3) */}
        <View style={styles.illustrationArea}>
          {renderIllustration(item, index)}
        </View>
        {/* 2. Heading + subtext – below illustration, centered */}
        <View style={styles.textSection}>
          <Title style={styles.title}>{item.title}</Title>
          <Body style={styles.body}>{item.body}</Body>
        </View>
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
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          contentContainerStyle={styles.flatListContent}
        />

        {/* Pagination dots – below carousel, centered */}
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

        {/* Get started – bottom, app CTA style */}
        <View style={[styles.bottomZone, { paddingBottom: insets.bottom + 16 }]}>
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
  flatListContent: {
    flexGrow: 1,
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 20,
  },
  /* Illustration – balanced height, content vertically centered, reduced padding */
  illustrationArea: {
    width: '100%',
    height: Math.round(SCREEN_HEIGHT * 0.36),
    backgroundColor: '#EEF3FF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationWrapper: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Text – below illustration, centered */
  textSection: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#111827',
  },
  body: {
    textAlign: 'center',
    color: '#6B7280',
  },
  /* Pagination – below carousel */
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
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
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    width: '100%',
  },
})
