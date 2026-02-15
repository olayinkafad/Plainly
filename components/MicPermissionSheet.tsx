import { useEffect, useState } from 'react'
import { View, StyleSheet, Pressable, Modal, Animated, Linking } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import LottieView from 'lottie-react-native'
import Icon from './Icon'
import { themeLight } from '../constants/theme'
import { Title, Body } from './typography'

interface MicPermissionSheetProps {
  isOpen: boolean
  mode?: 'request' | 'denied'
  onContinue: () => void
  onClose: () => void
}

export default function MicPermissionSheet({
  isOpen,
  mode = 'request',
  onContinue,
  onClose,
}: MicPermissionSheetProps) {
  const insets = useSafeAreaInsets()
  const [slideAnim] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (isOpen) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [isOpen, slideAnim])

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  })

  if (!isOpen) return null

  const isDenied = mode === 'denied'

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.overlay} />
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              paddingBottom: insets.bottom + 28,
            },
          ]}
        >
          <Pressable>
            {/* Close button */}
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Icon name="x" size={20} color={themeLight.textSecondary} />
            </Pressable>

            {isDenied ? (
              <>
                {/* Denied mode */}
                <Title style={styles.heading}>
                  Microphone access needed
                </Title>
                <Body style={styles.subtext}>
                  Plainly needs your microphone to record. You can turn it on in Settings.
                </Body>

                <View style={{ height: 28 }} />

                {/* Open Settings button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.continueButton,
                    pressed && styles.continueButtonPressed,
                  ]}
                  onPress={() => {
                    Linking.openSettings()
                    onClose()
                  }}
                  accessibilityLabel="Open Settings"
                  accessibilityRole="button"
                >
                  <Body style={styles.continueButtonText}>Open Settings</Body>
                </Pressable>

                {/* Not now link */}
                <Pressable
                  style={({ pressed }) => [
                    styles.notNowButton,
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={onClose}
                >
                  <Body style={styles.notNowText}>Not now</Body>
                </Pressable>
              </>
            ) : (
              <>
                {/* Request mode (first time) */}
                <Title style={styles.heading}>
                  Allow Plainly to access your microphone
                </Title>
                <Body style={styles.subtext}>
                  Plainly needs your microphone to hear what you're saying.
                </Body>

                {/* Illustration */}
                <View style={styles.illustrationContainer}>
                  <LottieView
                    source={require('../assets/voicemail-new.json')}
                    style={styles.illustrationLottie}
                    autoPlay
                    loop
                    speed={0.8}
                  />
                </View>

                {/* Continue button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.continueButton,
                    pressed && styles.continueButtonPressed,
                  ]}
                  onPress={onContinue}
                  accessibilityLabel="Continue to allow microphone access"
                  accessibilityRole="button"
                >
                  <Body style={styles.continueButtonText}>Continue</Body>
                </Pressable>
              </>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
    borderRadius: 20,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heading: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: themeLight.textPrimary,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: themeLight.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  illustrationLottie: {
    width: 180,
    height: 180,
  },
  continueButton: {
    backgroundColor: themeLight.accent,
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonPressed: {
    backgroundColor: themeLight.accentHover,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  notNowButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNowText: {
    color: themeLight.textSecondary,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
})
