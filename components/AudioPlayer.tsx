import { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { Audio } from 'expo-av'
import Icon from './Icon'
import { Body, Meta } from './typography'
import { themeLight } from '../constants/theme'

interface AudioPlayerProps {
  audioUri: string
  durationSec: number
}

export default function AudioPlayer({ audioUri, durationSec }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const [playbackDuration, setPlaybackDuration] = useState(0)
  const positionUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null)

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
      const status = await sound.getStatusAsync()
      if (isPlaying) {
        await sound.pauseAsync()
        setIsPlaying(false)
        if (positionUpdateInterval.current) {
          clearInterval(positionUpdateInterval.current)
          positionUpdateInterval.current = null
        }
      } else {
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

  const scrubberWidthRef = useRef(300)

  const handleScrubberLayout = (event: any) => {
    const { width } = event.nativeEvent.layout
    scrubberWidthRef.current = width
  }

  const handleScrubberPress = async (event: any) => {
    if (!sound) return

    try {
      const { locationX } = event.nativeEvent
      const scrubberWidth = scrubberWidthRef.current
      const percentage = locationX / scrubberWidth
      const newPosition = percentage * playbackDuration

      await sound.setPositionAsync(Math.max(0, Math.min(newPosition, playbackDuration)))
      setPlaybackPosition(Math.max(0, Math.min(newPosition, playbackDuration)))
    } catch (error) {
      console.error('Failed to scrub:', error)
    }
  }

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.playButton} onPress={togglePlayback}>
        {isPlaying ? (
          <Icon name="pause" size={20} color="#FFFFFF" />
        ) : (
          <Icon name="play" size={20} color="#FFFFFF" />
        )}
      </Pressable>
      <View style={styles.scrubberContainer}>
        <View style={styles.timeContainer}>
          <Meta style={styles.timeText}>{formatTime(playbackPosition)}</Meta>
          <Meta style={styles.timeText}>{formatTime(playbackDuration)}</Meta>
        </View>
        <Pressable
          style={styles.scrubber}
          onPress={handleScrubberPress}
          onLayout={handleScrubberLayout}
        >
          <View style={styles.scrubberTrack}>
            <View
              style={[
                styles.scrubberFill,
                {
                  width: `${playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0}%`,
                },
              ]}
            />
          </View>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16, // --space-4
    paddingHorizontal: 16, // --space-4
    backgroundColor: themeLight.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: themeLight.border,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeLight.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12, // --space-3
  },
  scrubberContainer: {
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8, // --space-2
  },
  timeText: {
    fontSize: 12,
    color: themeLight.textSecondary,
  },
  scrubber: {
    width: '100%',
  },
  scrubberTrack: {
    height: 4,
    backgroundColor: themeLight.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scrubberFill: {
    height: '100%',
    backgroundColor: themeLight.accent,
    borderRadius: 2,
  },
})
