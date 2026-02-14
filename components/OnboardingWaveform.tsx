import { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import Icon from './Icon'

const BAR_COUNT = 15
const BAR_HEIGHT_MAX = 40
const BAR_HEIGHT_MIN = 4
const PRIMARY_BLUE = '#2563EB'

export default function OnboardingWaveform() {
  const animValues = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3))
  ).current
  const pulseAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loops = animValues.map((val, i) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay((i * 55 + (i % 4) * 25) % 400),
          Animated.timing(val, {
            toValue: 1,
            duration: 320 + (i % 5) * 80,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 320 + (i % 5) * 80,
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
    outputRange: [1, 1.5],
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
          <Icon name="microphone" size={32} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.barsRow}>
        {animValues.map((val, i) => {
          const minScale = BAR_HEIGHT_MIN / BAR_HEIGHT_MAX
          const maxScale = 0.3 + (i % 6) * 0.12 + (i % 4) * 0.08
          const scaleY = val.interpolate({
            inputRange: [0, 1],
            outputRange: [minScale, Math.min(1, maxScale)],
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
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: PRIMARY_BLUE,
  },
  micCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  barsRow: {
    width: '85%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
    height: BAR_HEIGHT_MAX,
  },
  barOuter: {
    height: BAR_HEIGHT_MAX,
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 5,
    maxWidth: 6,
  },
  bar: {
    width: '100%',
    height: BAR_HEIGHT_MAX,
    borderRadius: 3,
    backgroundColor: PRIMARY_BLUE,
  },
})
