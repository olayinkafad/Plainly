import { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Easing, Text } from 'react-native'
import Icon from './Icon'


const BUBBLE_RADIUS = 18
const ICON_BOX_SIZE = 36
const ICON_BOX_RADIUS = 10
const ICON_SIZE = 19

const FLOAT_DISTANCE = 9
const FLOAT_DURATION = 5500
const FLOAT_DELAYS = [0, 1000, 2000, 500, 1500]

const DOT_SIZE = 5
const DOT_COLOR = 'rgba(43, 107, 242, 0.1)'

type BubbleKey = 'meetings' | 'ideas' | 'reflections' | 'todos' | 'conversations'

const BUBBLE_BG: Record<BubbleKey, string> = {
  meetings: '#EEF3FF',
  ideas: '#FFF8E6',
  reflections: '#EEFBF0',
  todos: '#FFF0F5',
  conversations: '#F0EDFF',
}

const BUBBLE_ICON_COLOR: Record<BubbleKey, string> = {
  meetings: '#4A6CF7',
  ideas: '#C4941C',
  reflections: '#1A8B4C',
  todos: '#C43D6B',
  conversations: '#6B5DD3',
}

const bubbles: {
  key: BubbleKey
  label: string
  icon: string
  large: boolean
  leftPercent: number
  topPercent: number
}[] = [
  { key: 'meetings', label: 'Meetings', icon: 'users', large: true, leftPercent: 8, topPercent: 12 },
  { key: 'ideas', label: 'Ideas', icon: 'lightbulb', large: false, leftPercent: 58, topPercent: 18 },
  { key: 'reflections', label: 'Reflections', icon: 'notebook', large: false, leftPercent: 6, topPercent: 48 },
  { key: 'todos', label: 'To-dos', icon: 'clipboard-text', large: true, leftPercent: 52, topPercent: 52 },
  { key: 'conversations', label: 'Conversations', icon: 'chats', large: false, leftPercent: 28, topPercent: 78 },
]

const connectorDots: Array<{ leftPercent: number; topPercent: number }> = [
  { leftPercent: 32, topPercent: 28 },
  { leftPercent: 22, topPercent: 72 },
  { leftPercent: 72, topPercent: 38 },
  { leftPercent: 48, topPercent: 68 },
  { leftPercent: 38, topPercent: 42 },
]

export default function OnboardingUseCaseCards() {
  const floatAnims = useRef(
    bubbles.map(() => new Animated.Value(0))
  ).current

  useEffect(() => {
    const loops = floatAnims.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(FLOAT_DELAYS[i]),
          Animated.timing(val, {
            toValue: 1,
            duration: FLOAT_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: FLOAT_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    )
    const composite = Animated.parallel(loops)
    composite.start()
    return () => composite.stop()
  }, [floatAnims])

  return (
    <View style={styles.container}>
      {/* Connector dots */}
      {connectorDots.map((dot, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              left: `${dot.leftPercent}%`,
              top: `${dot.topPercent}%`,
            },
          ]}
        />
      ))}

      {/* Floating bubbles */}
      {bubbles.map((bubble, i) => {
        const translateY = floatAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -FLOAT_DISTANCE],
        })
        return (
          <Animated.View
            key={bubble.key}
            style={[
              styles.bubble,
              bubble.large ? styles.bubbleLarge : styles.bubbleSmall,
              {
                left: `${bubble.leftPercent}%`,
                top: `${bubble.topPercent}%`,
                transform: [{ translateY }],
              },
            ]}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: BUBBLE_BG[bubble.key] },
              ]}
            >
              <Icon
                name={bubble.icon as 'users' | 'lightbulb' | 'notebook' | 'clipboard-text' | 'chats'}
                size={ICON_SIZE}
                color={BUBBLE_ICON_COLOR[bubble.key]}
              />
            </View>
            <Text style={styles.label}>{bubble.label}</Text>
          </Animated.View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: DOT_COLOR,
  },
  bubble: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BUBBLE_RADIUS,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bubbleLarge: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 10,
  },
  bubbleSmall: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  iconBox: {
    width: ICON_BOX_SIZE,
    height: ICON_BOX_SIZE,
    borderRadius: ICON_BOX_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    fontFamily: 'Satoshi-Medium',
  },
})
