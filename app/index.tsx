import { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native'
import { useRouter } from 'expo-router'
import { Title } from '../components/typography'
import Icon from '../components/Icon'
import { recordingsStore } from '../store/recordings'
import { themeLight } from '../constants/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const LOADER_WIDTH_RATIO = 0.55
const LOADER_DURATION_MS = 2500

const SPLASH_BG = themeLight.accent
const LOGO_ICON_COLOR = themeLight.accent

export default function Index() {
  const router = useRouter()
  const [hasRecordings, setHasRecordings] = useState<boolean | null>(null)
  const loaderAnim = useRef(new Animated.Value(0)).current
  const [loaderComplete, setLoaderComplete] = useState(false)

  // Check if user has recordings (returning user) in parallel with splash
  useEffect(() => {
    const checkRecordings = async () => {
      try {
        const recordings = await recordingsStore.getAll()
        setHasRecordings(recordings.length > 0)
      } catch (error) {
        console.error('Failed to check recordings:', error)
        setHasRecordings(false)
      }
    }
    checkRecordings()
  }, [])

  // Single run: animate loader from 0% to 100% with ease-in-out
  useEffect(() => {
    Animated.timing(loaderAnim, {
      toValue: 1,
      duration: LOADER_DURATION_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(() => setLoaderComplete(true))
  }, [loaderAnim])

  // When loader is complete and we know recordings state, navigate
  useEffect(() => {
    if (!loaderComplete || hasRecordings === null) return
    if (hasRecordings) {
      router.replace('/home')
    } else {
      router.replace('/onboarding')
    }
  }, [loaderComplete, hasRecordings, router])

  const trackWidth = SCREEN_WIDTH * LOADER_WIDTH_RATIO
  const fillWidth = loaderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, trackWidth],
  })

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logo}>
          <Icon name="microphone" size={32} color={LOGO_ICON_COLOR} />
        </View>
        <Title style={styles.appName}>Plainly</Title>
        <View style={[styles.loaderTrack, { width: trackWidth }]}>
          <Animated.View style={[styles.loaderFill, { width: fillWidth }]} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: themeLight.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    color: themeLight.textInverse,
    marginTop: 24,
    marginBottom: 60,
  },
  loaderTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  loaderFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: themeLight.cardBg,
  },
})
