import { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import Icon from './Icon'

const BAR_COUNT = 25
const PRIMARY_BLUE = '#2563EB'

export default function OnboardingWaveform() {
  const animValues = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3))
  ).current
  const pulseAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loops = animValues.map((val, i) => {
      const minScale = 0.15 + (i % 5) * 0.03
      const maxScale = 0.5 + (i % 7) * 0.08
      return Animated.loop(
        Animated.sequence([
          Animated.delay((i * 48 + (i % 3) * 20) % 350),
          Animated.timing(val, {
            toValue: 1,
            duration: 280 + (i % 6) * 70,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 280 + (i % 6) * 70,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    })
    const composite = Animated.parallel(loops)
    composite.start()
    return () => composite.stop()
  }, [animValues])

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.55],
  })
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.08, 0.2],
  })

  return (
    <View style={styles.container}>
      <View style={styles.micWrapper}>
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />
        <View style={styles.micCircle}>
          <Icon name="microphone" size={28} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.barsRow}>
        {animValues.map((val, i) => {
          const minScale = 0.15 + (i % 5) * 0.03
          const maxScale = Math.min(0.95, 0.5 + (i % 7) * 0.08)
          const scaleY = val.interpolate({
            inputRange: [0, 1],
            outputRange: [minScale, maxScale],
          })
          return (
            <View key={i} style={styles.barOuter}>
              <Animated.View
                style={[
                  styles.bar,
                  {
                    transform: [{ scaleY }],
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
  },
  micWrapper: {
    position: 'relative',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY_BLUE,
  },
  micCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  barsRow: {
    width: '80%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: 40,
  },
  barOuter: {
    height: 32,
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 3,
  },
  bar: {
    width: '100%',
    height: 32,
    borderRadius: 3,
    backgroundColor: PRIMARY_BLUE,
  },
})
