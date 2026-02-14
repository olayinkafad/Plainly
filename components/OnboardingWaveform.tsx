import { useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native'
import Icon from './Icon'
import { themeLight } from '../constants/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const ILLUSTRATION_WIDTH = SCREEN_WIDTH - 32 - 32
const ILLUSTRATION_HEIGHT = Math.round(SCREEN_HEIGHT * 0.45)

const BAR_COUNT = 25
const BAR_WIDTH = 3
const BAR_GAP = 3.5
const BAR_RADIUS = 2
const BAR_HEIGHT_MAX = 40
const MIC_SIZE = 80
const MIC_ICON_SIZE = 32
const GAP_MIC_TO_WAVEFORM = 28

const ACCENT = themeLight.accent

const RING_SIZES = [130, 160, 200]
const RING_DELAYS = [0, 1000, 2000]
const MIC_RING_WRAPPER_SIZE = 220

// Bar heights 6–40px, more variation (speech-like, not clumped)
const BAR_HEIGHTS = [
  8, 24, 6, 32, 14, 38, 10, 28, 18, 36, 12, 40, 16, 22, 30, 8, 34, 20, 26, 14,
  28, 18, 36, 10, 24,
]
const BAR_OPACITIES = [
  0.65, 0.9, 0.35, 0.85, 0.5, 1, 0.4, 0.7, 0.8, 0.25, 0.95, 0.55, 0.88, 0.6,
  0.75, 0.45, 0.92, 0.7, 0.82, 0.68, 1, 0.5, 0.78, 0.58, 0.72,
]

const PHRASES = [
  'remind me to...',
  'oh one more thing',
  'I was thinking...',
  'so basically',
  "don't forget...",
  'wait, actually',
  'what if we...',
  'okay so',
  'I need to...',
  'let me think',
] as const

// Top zone (above mic), bottom zone (below waveform), left/right edges only. Center column clear.
// [x fraction 0–1, y fraction 0–1, alignRight]. Right-aligned phrases use right: 16 so they don't clip.
const PHRASE_LAYOUT: Array<[number, number, boolean]> = [
  [0.12, 0.08, false],
  [0, 0.06, true],
  [0.18, 0.15, false],
  [0, 0.12, true],
  [0.08, 0.82, false],
  [0, 0.78, true],
  [0.15, 0.88, false],
  [0, 0.92, true],
  [0.06, 0.45, false],
  [0, 0.52, true],
]
const PHRASE_OPACITIES = [0.45, 0.35, 0.55, 0.45, 0.35, 0.55, 0.45, 0.35, 0.55, 0.45]
const PHRASE_FONT_SIZES = [11, 10.5, 12, 11, 10.5, 12, 11, 10.5, 12, 11]

export default function OnboardingWaveform() {
  const breatheAnim = useRef(new Animated.Value(0)).current
  const ringAnims = useRef(
    RING_SIZES.map(() => new Animated.Value(0))
  ).current
  const barAnims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0))
  ).current
  const phraseAnims = useRef(
    Array.from({ length: PHRASES.length }, () => new Animated.Value(0))
  ).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [breatheAnim])

  // Pulse rings: concentric expansion from mic center, scale 0.5→1.5, opacity 0.6→0, more visible (bg 0.1)
  useEffect(() => {
    const loops = ringAnims.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(RING_DELAYS[i]),
          Animated.timing(val, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    )
    const composite = Animated.parallel(loops)
    composite.start()
    return () => composite.stop()
  }, [ringAnims])

  useEffect(() => {
    const loops = barAnims.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(Math.round(i * 70)),
          Animated.timing(val, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    )
    const composite = Animated.parallel(loops)
    composite.start()
    return () => composite.stop()
  }, [barAnims])

  // Phrases: 10–12px drift, 6s loop, opacity 0.4–1.0
  useEffect(() => {
    const loops = phraseAnims.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 350),
          Animated.timing(val, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    )
    const composite = Animated.parallel(loops)
    composite.start()
    return () => composite.stop()
  }, [phraseAnims])

  const breatheScale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  })
  const glowOpacity = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.14],
  })

  const contentWidth = ILLUSTRATION_WIDTH - 32
  const waveformWidth = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP
  const targetWidth = contentWidth * 0.75
  const scaleX = targetWidth / waveformWidth

  return (
    <View style={styles.container}>
      {/* Floating phrases – top, bottom, left/right only; 16px from edges via container padding */}
      {PHRASES.map((phrase, i) => {
        const [xFraction, yFraction, alignRight] = PHRASE_LAYOUT[i]
        const driftY = phraseAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -11],
        })
        const opacity = phraseAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0.4, 1],
        })
        return (
          <Animated.Text
            key={i}
            style={[
              styles.phrase,
              alignRight ? { right: 16, left: undefined, textAlign: 'right' } : { left: `${xFraction * 100}%` },
              {
                top: `${yFraction * 100}%`,
                color: `rgba(${themeLight.accentRgb}, ${PHRASE_OPACITIES[i]})`,
                fontSize: PHRASE_FONT_SIZES[i],
                transform: [{ translateY: driftY }],
                opacity,
              },
            ]}
            numberOfLines={1}
          >
            {phrase}
          </Animated.Text>
        )
      })}

      {/* Mic section: radial glow + pulse rings + mic, all centered in one wrapper */}
      <View style={styles.micSection}>
        <Animated.View
          style={[
            styles.radialGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: breatheScale }],
            },
          ]}
        />
        {RING_SIZES.map((size, i) => {
          const scale = ringAnims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 1.5],
          })
          const opacity = ringAnims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 0],
          })
          const ringLeft = (MIC_RING_WRAPPER_SIZE - size) / 2
          const ringTop = (MIC_RING_WRAPPER_SIZE - size) / 2
          return (
            <Animated.View
              key={i}
              style={[
                styles.pulseRing,
                {
                  left: ringLeft,
                  top: ringTop,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            />
          )
        })}
        <Animated.View
          style={[
            styles.micCircle,
            {
              transform: [{ scale: breatheScale }],
            },
          ]}
        >
          <Icon name="microphone" size={MIC_ICON_SIZE} color="#FFFFFF" />
        </Animated.View>
      </View>

      {/* Waveform – 28px below mic, centered, ~75% width */}
      <View style={[styles.waveformWrap, { transform: [{ scaleX }] }]}>
        {barAnims.map((val, i) => {
          const scaleY = val.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 1.3],
          })
          const h = BAR_HEIGHTS[i]
          const translateY = val.interpolate({
            inputRange: [0, 1],
            outputRange: [h * 0.25, -h * 0.15],
          })
          return (
            <View key={i} style={[styles.barOuter, { height: BAR_HEIGHT_MAX }]}>
              <Animated.View
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: ACCENT,
                    opacity: BAR_OPACITIES[i],
                    transform: [{ translateY }, { scaleY }],
                  },
                ]}
              />
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  phrase: {
    position: 'absolute',
    fontFamily: 'Satoshi-Medium',
    fontWeight: '500',
    maxWidth: '38%',
  },
  micSection: {
    width: MIC_RING_WRAPPER_SIZE,
    height: MIC_RING_WRAPPER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radialGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    left: (MIC_RING_WRAPPER_SIZE - 200) / 2,
    top: (MIC_RING_WRAPPER_SIZE - 200) / 2,
    borderRadius: 100,
    backgroundColor: `rgba(${themeLight.accentRgb}, 0.12)`,
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: `rgba(${themeLight.accentRgb}, 0.1)`,
  },
  micCircle: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: themeLight.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 8,
  },
  waveformWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: BAR_GAP,
    height: BAR_HEIGHT_MAX,
    marginTop: GAP_MIC_TO_WAVEFORM,
    zIndex: 1,
  },
  barOuter: {
    width: BAR_WIDTH,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: BAR_RADIUS,
  },
})
