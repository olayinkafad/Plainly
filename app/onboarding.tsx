import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent, Animated, AccessibilityInfo, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Title, Body } from '../components/typography'
import Icon from '../components/Icon'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface Slide {
  title: string
  body: string
}

const slides: Slide[] = [
  {
    title: 'Messy thoughts are okay',
    body: "You don't need to be clear. Just speak naturally.",
  },
  {
    title: 'Plainly finds the structure',
    body: 'Turn voice notes into summaries, key points, or action items.',
  },
  {
    title: 'Clarity in seconds',
    body: 'Record once. Choose what you need.',
  },
]

export default function Onboarding() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isUserInteracting, setIsUserInteracting] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const flatListRef = useRef<FlatList>(null)
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const illustrationFloatAnim = useRef(new Animated.Value(0)).current
  
  // Pulse ring animations
  const ring1Anim = useRef(new Animated.Value(0)).current
  const ring2Anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setPrefersReducedMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setPrefersReducedMotion)
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) return

    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(illustrationFloatAnim, {
          toValue: 1,
          duration: 7000,
          useNativeDriver: true,
        }),
        Animated.timing(illustrationFloatAnim, {
          toValue: 0,
          duration: 7000,
          useNativeDriver: true,
        }),
      ])
    )
    floatAnimation.start()
    return () => floatAnimation.stop()
  }, [prefersReducedMotion])

  // Pulse ring animation
  useEffect(() => {
    if (prefersReducedMotion) {
      ring1Anim.setValue(0)
      ring2Anim.setValue(0)
      return
    }

    const createRingAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    }

    // Reset values before starting
    ring1Anim.setValue(0)
    ring2Anim.setValue(0)

    const ring1Animation = createRingAnimation(ring1Anim, 0)
    const ring2Animation = createRingAnimation(ring2Anim, 700)

    ring1Animation.start()
    ring2Animation.start()

    return () => {
      ring1Animation.stop()
      ring2Animation.stop()
    }
  }, [prefersReducedMotion, ring1Anim, ring2Anim])

  const ring1Scale = ring1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  })

  const ring1Opacity = ring1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0],
  })

  const ring2Scale = ring2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  })

  const ring2Opacity = ring2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0],
  })

  const illustrationTranslateY = illustrationFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 4],
  })

  // Auto-play: advance every 3.5 seconds
  useEffect(() => {
    if (isUserInteracting) {
      return // Pause auto-play while user is interacting
    }

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1
        // Loop back to first slide after last
        if (nextIndex >= slides.length) {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
          return 0
        }
        // Use scrollToOffset for exact positioning
        flatListRef.current?.scrollToOffset({
          offset: nextIndex * SCREEN_WIDTH,
          animated: true,
        })
        return nextIndex
      })
    }, 3500)

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current)
      }
    }
  }, [isUserInteracting])

  // Handle manual swipe - update index from scroll position
  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(offsetX / SCREEN_WIDTH)
    
    if (index >= 0 && index < slides.length && index !== currentIndex) {
      setCurrentIndex(index)
    }
  }

  const handleScrollBeginDrag = () => {
    setIsUserInteracting(true)
    // Clear any existing resume timer
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
    }
    // Clear auto-play timer
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current)
      autoPlayTimerRef.current = null
    }
  }

  const handleScrollEndDrag = () => {
    // Resume auto-play 2 seconds after user finishes swiping
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
    }
    resumeTimerRef.current = setTimeout(() => {
      setIsUserInteracting(false)
    }, 2000)
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current)
      }
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current)
      }
    }
  }, [])

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slideContainer}>
      <View style={styles.slide}>
        {/* Zone A: Top - Title and Subtext */}
        <View style={styles.topZone}>
          <View style={styles.textContainer}>
            <Title style={styles.title}>{item.title}</Title>
            <Body style={styles.body}>{item.body}</Body>
          </View>
        </View>

        {/* Zone B: Middle - Illustration area */}
        <View style={styles.middleZone}>
          <Animated.View
            style={[
              styles.illustrationContainer,
              prefersReducedMotion ? {} : { transform: [{ translateY: illustrationTranslateY }] },
            ]}
          >
            <View style={styles.illustrationPlaceholder}>
              <View style={styles.illustrationIcon} />
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Progress indicators - always visible at top */}
        <View style={styles.progressContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressBar,
                index === currentIndex && styles.progressActive,
              ]}
            />
          ))}
        </View>

        {/* Carousel */}
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(_, index) => `slide-${index}`}
          horizontal
          pagingEnabled={true}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="start"
          disableIntervalMomentum={true}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          contentContainerStyle={styles.flatListContent}
        />

        {/* Zone C: Bottom - Animated CTA fixed to bottom */}
        <View style={[styles.bottomZone, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={styles.ctaContainer}
            onPress={() => {
              router.push('/home?startRecording=true')
            }}
            accessibilityLabel="Record your first thought"
            accessibilityRole="button"
          >
            {/* Label card - at the top */}
            <View style={styles.labelCard}>
              <Body style={styles.labelText}>Record your first thought</Body>
            </View>
            {/* Pulse rings */}
            <View style={styles.pulseContainer}>
              {!prefersReducedMotion && (
                <>
                  <Animated.View
                    style={[
                      styles.pulseRing,
                      {
                        transform: [{ scale: ring1Scale }],
                        opacity: ring1Opacity,
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.pulseRing,
                      {
                        transform: [{ scale: ring2Scale }],
                        opacity: ring2Opacity,
                      },
                    ]}
                  />
                </>
              )}
              {/* Solid circle */}
              <View style={styles.solidCircle}>
                <Icon name="microphone" size={28} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>
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
  // Progress indicators
  progressContainer: {
    flexDirection: 'row',
    gap: 8, // --space-2
    marginBottom: 32, // --space-8
    paddingTop: 24, // --space-6
    paddingHorizontal: 16, // --space-4
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB', // --color-border-default
  },
  progressActive: {
    backgroundColor: '#2563EB', // --color-accent-primary
  },
  // FlatList container
  flatListContent: {
    // No horizontal padding - slides handle their own padding
  },
  // Slide container - MUST be exactly SCREEN_WIDTH
  slideContainer: {
    width: SCREEN_WIDTH,
  },
  // Slide content with padding
  slide: {
    flex: 1,
    paddingHorizontal: 24, // Consistent horizontal padding inside slide
  },
  // Zone A: Top
  topZone: {
    // Title and subtext near top, left-aligned
  },
  textContainer: {
    // Left-aligned, no vertical centering
  },
  title: {
    marginBottom: 12, // --space-3
    color: '#111827', // --color-text-primary
  },
  body: {
    color: '#6B7280', // --color-text-secondary
  },
  // Zone B: Middle
  middleZone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    paddingVertical: 40,
  },
  illustrationContainer: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F9FAFB', // --color-bg-secondary
    borderRadius: 10, // --radius-md
    borderWidth: 1,
    borderColor: '#F1F5F9', // --color-border-subtle
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB', // --color-border-default
  },
  // Zone C: Bottom
  bottomZone: {
    paddingTop: 24, // --space-6
    paddingHorizontal: 16, // --space-4
    width: '100%',
    alignItems: 'center',
  },
  ctaContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16, // --space-4
  },
  pulseContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB', // --color-accent-primary
  },
  solidCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB', // --color-accent-primary
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  labelCard: {
    backgroundColor: '#F9FAFB', // --color-bg-secondary
    paddingHorizontal: 16, // --space-4
    paddingVertical: 12, // --space-3
    borderRadius: 10, // --radius-md
    borderWidth: 1,
    borderColor: '#E5E7EB', // --color-border-default
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  labelText: {
    color: '#111827', // --color-text-primary
    fontSize: 14, // --font-size-sm
    fontWeight: '500', // --font-weight-medium
  },
})
