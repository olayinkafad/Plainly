import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio'
import Icon from './Icon'
import { Body } from './typography'
import { themeLight } from '../constants/theme'

interface AudioPlayerProps {
  audioUri: string
  durationSec: number
}

export interface AudioPlayerHandle {
  seekTo: (positionMs: number) => Promise<void>
}

const SPEED_OPTIONS = [1, 1.5, 2, 0.5]

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(function AudioPlayer({ audioUri, durationSec }, ref) {
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const scrubberWidthRef = useRef(200)
  const prevUriRef = useRef(audioUri)

  const player = useAudioPlayer({ uri: audioUri })
  const status = useAudioPlayerStatus(player)

  // Set audio mode on mount
  useEffect(() => {
    setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
  }, [])

  // When audioUri changes, replace the source
  useEffect(() => {
    if (audioUri !== prevUriRef.current) {
      prevUriRef.current = audioUri
      player.replace({ uri: audioUri })
      setPlaybackSpeed(1)
    }
  }, [audioUri, player])

  // Handle didJustFinish — expo-audio does NOT auto-reset position
  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0)
    }
  }, [status.didJustFinish, player])

  // Derive ms values from status (seconds → ms for display)
  const positionMs = (status.currentTime ?? 0) * 1000
  const durationMs = (status.duration > 0 ? status.duration : durationSec) * 1000

  useImperativeHandle(ref, () => ({
    seekTo: async (positionMs: number) => {
      try {
        const maxSec = status.duration > 0 ? status.duration : durationSec
        const seconds = Math.max(0, Math.min(positionMs / 1000, maxSec))
        player.seekTo(seconds)
      } catch (error) {
        console.error('Failed to seek:', error)
      }
    },
  }), [player, status.duration, durationSec])

  const togglePlayback = () => {
    if (status.playing) {
      player.pause()
    } else {
      // If at end, reset to start before playing
      const currentSec = status.currentTime ?? 0
      const totalSec = status.duration > 0 ? status.duration : durationSec
      if (totalSec > 0 && currentSec >= totalSec - 0.1) {
        player.seekTo(0)
      }
      player.play()
    }
  }

  const handleScrubberPress = (event: any) => {
    const { locationX } = event.nativeEvent
    const pct = locationX / scrubberWidthRef.current
    const totalSec = status.duration > 0 ? status.duration : durationSec
    const seekSec = Math.max(0, Math.min(pct * totalSec, totalSec))
    player.seekTo(seekSec)
  }

  const cycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed)
    const nextSpeed = SPEED_OPTIONS[(currentIndex + 1) % SPEED_OPTIONS.length]
    player.setPlaybackRate(nextSpeed)
    setPlaybackSpeed(nextSpeed)
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
        <Icon name={status.playing ? 'pause' : 'play'} size={16} color="#FFFFFF" />
      </Pressable>
      <Body style={styles.timeText}>{formatTime(positionMs)}</Body>
      <Pressable
        style={styles.progressTrack}
        onPress={handleScrubberPress}
        onLayout={(e) => { scrubberWidthRef.current = e.nativeEvent.layout.width }}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${durationMs > 0 ? (positionMs / durationMs) * 100 : 0}%` },
          ]}
        />
      </Pressable>
      <Body style={styles.timeText}>{formatTime(durationMs)}</Body>
      <Pressable style={styles.speedPill} onPress={cycleSpeed}>
        <Body style={styles.speedText}>{formatSpeedLabel(playbackSpeed)}</Body>
      </Pressable>
    </View>
  )
})

export default AudioPlayer

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
