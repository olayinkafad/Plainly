import { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Dimensions, AccessibilityInfo, Animated } from 'react-native'
import Icon from './Icon'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

interface AmbientIconBackgroundProps {
  variant: 'splash' | 'onboarding'
}

// Icon positions - 18 icons evenly distributed across screen
// Low opacity (0.06-0.12), subtle drift animation
// Positioned to avoid clear zones but fill all available white space
// Evenly distributed like inspiration image - not clustered, well-spaced
const ICON_CONFIGS = [
  // Top row - evenly spaced across top, well above logo (y: 0.12-0.18)
  { name: 'sparkle', x: 0.15, y: 0.14, size: 40, duration: 6000, offset: 8, delay: 0, opacity: 0.08 },
  { name: 'microphone', x: 0.32, y: 0.16, size: 45, duration: 5500, offset: 10, delay: 400, opacity: 0.10 },
  { name: 'file-text', x: 0.50, y: 0.13, size: 38, duration: 6500, offset: 6, delay: 800, opacity: 0.07 },
  { name: 'play', x: 0.68, y: 0.15, size: 42, duration: 5800, offset: 9, delay: 1200, opacity: 0.09 },
  { name: 'sparkle', x: 0.85, y: 0.14, size: 40, duration: 6200, offset: 7, delay: 1600, opacity: 0.08 },
  
  // Upper-middle row - sides only, above text area (y: 0.25-0.30)
  { name: 'microphone', x: 0.18, y: 0.27, size: 44, duration: 6000, offset: 8, delay: 200, opacity: 0.10 },
  { name: 'file-text', x: 0.82, y: 0.25, size: 39, duration: 6400, offset: 6, delay: 600, opacity: 0.07 },
  
  // Left and right sides - middle vertical, outside text zone (x: 0.12-0.18 and 0.82-0.88, y: 0.48-0.52)
  { name: 'play', x: 0.15, y: 0.50, size: 42, duration: 5900, offset: 9, delay: 1000, opacity: 0.09 },
  { name: 'sparkle', x: 0.85, y: 0.48, size: 40, duration: 6000, offset: 8, delay: 1400, opacity: 0.08 },
  
  // Lower-middle row - sides only, below text area (y: 0.65-0.70)
  { name: 'microphone', x: 0.20, y: 0.67, size: 45, duration: 5500, offset: 10, delay: 300, opacity: 0.10 },
  { name: 'file-text', x: 0.80, y: 0.69, size: 38, duration: 6500, offset: 6, delay: 700, opacity: 0.07 },
  
  // Bottom row - evenly spaced across bottom, well below CTA (y: 0.88-0.94)
  { name: 'play', x: 0.12, y: 0.90, size: 42, duration: 5800, offset: 9, delay: 500, opacity: 0.09 },
  { name: 'sparkle', x: 0.30, y: 0.92, size: 40, duration: 6200, offset: 7, delay: 900, opacity: 0.08 },
  { name: 'microphone', x: 0.50, y: 0.89, size: 44, duration: 6000, offset: 8, delay: 1300, opacity: 0.10 },
  { name: 'file-text', x: 0.70, y: 0.91, size: 39, duration: 6400, offset: 6, delay: 1700, opacity: 0.07 },
  { name: 'play', x: 0.88, y: 0.93, size: 41, duration: 5900, offset: 9, delay: 2100, opacity: 0.09 },
  
  // Additional scattered icons for better coverage - positioned to avoid clear zones
  { name: 'sparkle', x: 0.25, y: 0.22, size: 36, duration: 6300, offset: 7, delay: 1100, opacity: 0.08 },
  { name: 'microphone', x: 0.75, y: 0.72, size: 37, duration: 6100, offset: 8, delay: 1500, opacity: 0.09 },
]

// Clear zones where icons should not appear (for text areas)
// Made more precise to allow more icons to show
const CLEAR_ZONES = {
  splash: [
    // Top logo area - smaller, more precise
    { x: 0.30, y: 0.08, width: 0.4, height: 0.15 },
    // Middle text area (headline + subtext) - more precise
    { x: 0.10, y: 0.38, width: 0.8, height: 0.25 },
    // Bottom CTA area - smaller
    { x: 0.10, y: 0.78, width: 0.8, height: 0.15 },
  ],
  onboarding: [
    // Top progress + title area - more precise
    { x: 0.10, y: 0.08, width: 0.8, height: 0.20 },
    // Middle illustration area (centered) - more precise
    { x: 0.20, y: 0.32, width: 0.6, height: 0.35 },
    // Bottom CTA area - smaller
    { x: 0.10, y: 0.82, width: 0.8, height: 0.12 },
  ],
}

// Check if a point is in any clear zone
const isInClearZone = (x: number, y: number, variant: 'splash' | 'onboarding'): boolean => {
  const zones = CLEAR_ZONES[variant]
  return zones.some(zone => {
    return (
      x >= zone.x &&
      x <= zone.x + zone.width &&
      y >= zone.y &&
      y <= zone.y + zone.height
    )
  })
}

export default function AmbientIconBackground({ variant }: AmbientIconBackgroundProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  // Initialize all Animated.Values upfront so they exist on first render
  const animations = useRef<Animated.Value[]>(
    ICON_CONFIGS.map(() => new Animated.Value(0))
  )
  const animationInstances = useRef<Animated.CompositeAnimation[]>([])

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setPrefersReducedMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setPrefersReducedMotion)
    return () => subscription.remove()
  }, [])

  // Initialize animations
  useEffect(() => {
    // Stop all existing animations
    animationInstances.current.forEach(anim => anim.stop())
    animationInstances.current = []

    if (prefersReducedMotion) {
      // Reset all values to 0 for static display
      animations.current.forEach(val => val.setValue(0))
      return
    }

    const animInstances: Animated.CompositeAnimation[] = []

    ICON_CONFIGS.forEach((config, index) => {
      const animValue = animations.current[index]

      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(config.delay || 0),
          Animated.timing(animValue, {
            toValue: 1,
            duration: config.duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: config.duration,
            useNativeDriver: true,
          }),
        ])
      )

      animInstances.push(anim)
      anim.start()
    })

    animationInstances.current = animInstances

    return () => {
      animInstances.forEach(anim => anim.stop())
    }
  }, [prefersReducedMotion])

  // Filter icons that are in clear zones
  const visibleIcons = ICON_CONFIGS.map((config, originalIndex) => ({
    ...config,
    originalIndex,
  })).filter(({ x, y }) => {
    return !isInClearZone(x, y, variant)
  })

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Gradient Background - soft blue-white */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FDFCFB' }]} />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#F5E0D8',
            opacity: 0.5,
          },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#FDFCFB',
            opacity: 0.7,
          },
        ]}
      />

      {/* Floating Icons */}
      {visibleIcons.map((config) => {
        const animValue = animations.current[config.originalIndex]

        const translateX = animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [-config.offset, config.offset],
        })

        const translateY = animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [-config.offset * 0.7, config.offset * 0.7],
        })

        // Center the icon at the position
        const iconCenterX = config.x * SCREEN_WIDTH - config.size / 2
        const iconCenterY = config.y * SCREEN_HEIGHT - config.size / 2

        return (
          <Animated.View
            key={`${config.name}-${config.originalIndex}`}
            style={[
              styles.iconContainer,
              {
                left: iconCenterX,
                top: iconCenterY,
                opacity: config.opacity || 0.10,
                transform: prefersReducedMotion
                  ? []
                  : [{ translateX }, { translateY }],
              },
            ]}
          >
            <Icon
              name={config.name}
              size={config.size}
              color="#C45D3E"
            />
          </Animated.View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
