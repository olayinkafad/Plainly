import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { Audio } from 'expo-av'
import Icon from './Icon'
import { Body } from './typography'
import { themeLight } from '../constants/theme'

interface AudioPlayerProps {
  audioUri: string
  durationSec: number
}

const SPEED_OPTIONS = [1, 1.5, 2, 0.5]

export default function AudioPlayer({ audioUri, durationSec }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const [playbackDuration, setPlaybackDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const positionUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrubberWidthRef = useRef(200)

  useEffect(() => {
    loadAudio()
    return () => {
      if (sound) {
        sound.unloadAsync().catch(console.error)
      }
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current)
      }
    }
  }, [audioUri])

  const loadAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      })

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false }
      )

      const status = await newSound.getStatusAsync()
      if (status.isLoaded) {
        setPlaybackDuration(status.durationMillis || durationSec * 1000)
      }

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis || 0)
          if (status.didJustFinish) {
            setIsPlaying(false)
            setPlaybackPosition(0)
            newSound.setPositionAsync(0).catch(console.error)
            if (positionUpdateInterval.current) {
              clearInterval(positionUpdateInterval.current)
              positionUpdateInterval.current = null
            }
          }
        }
      })

      setSound(newSound)
    } catch (error) {
      console.error('Failed to load audio:', error)
    }
  }

  const togglePlayback = async () => {
    if (!sound) return

    try {
      if (isPlaying) {
        await sound.pauseAsync()
        setIsPlaying(false)
        if (positionUpdateInterval.current) {
          clearInterval(positionUpdateInterval.current)
          positionUpdateInterval.current = null
        }
      } else {
        const status = await sound.getStatusAsync()
        if (status.isLoaded) {
          const currentPosition = status.positionMillis || 0
          const duration = status.durationMillis || playbackDuration
          if (currentPosition >= duration - 100) {
            await sound.setPositionAsync(0)
            setPlaybackPosition(0)
          }
        }
        await sound.playAsync()
        setIsPlaying(true)
        if (!positionUpdateInterval.current) {
          positionUpdateInterval.current = setInterval(async () => {
            if (sound) {
              const currentStatus = await sound.getStatusAsync()
              if (currentStatus.isLoaded) {
                setPlaybackPosition(currentStatus.positionMillis || 0)
              }
            }
          }, 100)
        }
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error)
    }
  }

  const handleScrubberPress = async (event: any) => {
    if (!sound) return
    try {
      const { locationX } = event.nativeEvent
      const percentage = locationX / scrubberWidthRef.current
      const newPos = percentage * playbackDuration
      await sound.setPositionAsync(Math.max(0, Math.min(newPos, playbackDuration)))
      setPlaybackPosition(Math.max(0, Math.min(newPos, playbackDuration)))
    } catch (error) {
      console.error('Failed to scrub:', error)
    }
  }

  const cycleSpeed = async () => {
    if (!sound) return
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed)
    const nextSpeed = SPEED_OPTIONS[(currentIndex + 1) % SPEED_OPTIONS.length]
    try {
      await sound.setRateAsync(nextSpeed, true)
      setPlaybackSpeed(nextSpeed)
    } catch (error) {
      console.error('Failed to change speed:', error)
    }
  }

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatSpeedLabel = (speed: number): string => {
    if (speed === 0.5) return '0.5x'
    if (speed === 1) return '1x'
    return `${speed}x`
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.playButton} onPress={togglePlayback}>
        <Icon name={isPlaying ? 'pause' : 'play'} size={16} color="#FFFFFF" />
      </Pressable>
      <Body style={styles.timeText}>{formatTime(playbackPosition)}</Body>
      <Pressable
        style={styles.progressTrack}
        onPress={handleScrubberPress}
        onLayout={(e) => { scrubberWidthRef.current = e.nativeEvent.layout.width }}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0}%` },
          ]}
        />
      </Pressable>
      <Body style={styles.timeText}>{formatTime(playbackDuration)}</Body>
      <Pressable style={styles.speedPill} onPress={cycleSpeed}>
        <Body style={styles.speedText}>{formatSpeedLabel(playbackSpeed)}</Body>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: themeLight.borderSubtle,
    borderBottomWidth: 1,
    borderBottomColor: themeLight.borderSubtle,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeLight.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: themeLight.textSecondary,
    marginLeft: 12,
  },
  progressTrack: {
    height: 3,
    backgroundColor: themeLight.border,
    borderRadius: 1.5,
    flex: 1,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: themeLight.accent,
    borderRadius: 1.5,
  },
  speedPill: {
    backgroundColor: themeLight.bgTertiary,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: themeLight.textPrimary,
  },
})
