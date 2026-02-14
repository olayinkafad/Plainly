import { useRef, forwardRef, useImperativeHandle } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import Icon from './Icon'
import { Body } from './typography'
import { themeLight } from '../constants/theme'
import { useSharedAudioPlayer } from '../contexts/AudioPlayerContext'

interface AudioPlayerProps {
  recordingId: string
  audioUri: string
  durationSec: number
}

export interface AudioPlayerHandle {
  seekTo: (positionMs: number) => Promise<void>
}

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(function AudioPlayer({ recordingId, audioUri, durationSec }, ref) {
  const audio = useSharedAudioPlayer()
  const scrubberWidthRef = useRef(200)

  const isThisRecording = audio.playingRecordingId === recordingId
  const isPlaying = isThisRecording && audio.isPlaying
  const currentTimeSec = isThisRecording ? audio.currentTime : 0
  const durationFromPlayer = isThisRecording && audio.duration > 0 ? audio.duration : durationSec

  const positionMs = currentTimeSec * 1000
  const durationMs = durationFromPlayer * 1000

  useImperativeHandle(ref, () => ({
    seekTo: async (positionMs: number) => {
      if (!isThisRecording) {
        await audio.loadAndPlay(recordingId, audioUri)
      }
      const seconds = Math.max(0, Math.min(positionMs / 1000, durationFromPlayer))
      audio.seekTo(seconds)
    },
  }), [audio, recordingId, audioUri, isThisRecording, durationFromPlayer])

  const handlePlayPress = () => {
    audio.loadAndPlay(recordingId, audioUri)
  }

  const handleScrubberPress = (event: any) => {
    const { locationX } = event.nativeEvent
    const pct = locationX / scrubberWidthRef.current
    const seekSec = Math.max(0, Math.min(pct * durationFromPlayer, durationFromPlayer))

    if (isThisRecording) {
      audio.seekTo(seekSec)
    } else {
      audio.loadAndPlay(recordingId, audioUri).then(() => {
        audio.seekTo(seekSec)
      })
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
      <Pressable style={styles.playButton} onPress={handlePlayPress}>
        <Icon name={isPlaying ? 'pause' : 'play'} size={16} color="#FFFFFF" />
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
      <Pressable style={styles.speedPill} onPress={isThisRecording ? audio.cycleSpeed : undefined}>
        <Body style={styles.speedText}>{formatSpeedLabel(isThisRecording ? audio.playbackSpeed : 1)}</Body>
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
