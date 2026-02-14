import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio'

const SPEED_OPTIONS = [1, 1.5, 2, 0.5] as const

interface SharedAudioState {
  playingRecordingId: string | null
  playbackSpeed: number
  isPlaying: boolean
  currentTime: number
  duration: number
  loadAndPlay: (recordingId: string, audioUri: string) => Promise<void>
  togglePlayback: () => void
  seekTo: (seconds: number) => void
  cycleSpeed: () => void
  close: () => void
}

const AudioPlayerContext = createContext<SharedAudioState | null>(null)

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(null)
  const status = useAudioPlayerStatus(player)

  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  // Reset to start when playback finishes
  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0)
    }
  }, [status.didJustFinish, player])

  const loadAndPlay = useCallback(async (recordingId: string, audioUri: string) => {
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })

    if (playingRecordingId === recordingId) {
      if (status.playing) {
        player.pause()
      } else {
        const currentSec = status.currentTime ?? 0
        const totalSec = status.duration ?? 0
        if (totalSec > 0 && currentSec >= totalSec - 0.1) {
          player.seekTo(0)
        }
        player.play()
      }
      return
    }

    player.replace({ uri: audioUri })
    player.play()
    setPlayingRecordingId(recordingId)
    setPlaybackSpeed(1)
  }, [player, playingRecordingId, status])

  const togglePlayback = useCallback(() => {
    if (status.playing) {
      player.pause()
    } else {
      const currentSec = status.currentTime ?? 0
      const totalSec = status.duration ?? 0
      if (totalSec > 0 && currentSec >= totalSec - 0.1) {
        player.seekTo(0)
      }
      player.play()
    }
  }, [player, status])

  const seekTo = useCallback((seconds: number) => {
    const totalSec = status.duration ?? 0
    player.seekTo(Math.max(0, Math.min(seconds, totalSec)))
  }, [player, status.duration])

  const cycleSpeed = useCallback(() => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed as typeof SPEED_OPTIONS[number])
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length
    const nextSpeed = SPEED_OPTIONS[nextIndex]
    setPlaybackSpeed(nextSpeed)
    player.setPlaybackRate(nextSpeed)
  }, [player, playbackSpeed])

  const close = useCallback(() => {
    setPlayingRecordingId(null)
    setPlaybackSpeed(1)
    try {
      player.pause()
      player.replace(null)
    } catch (_) {}
  }, [player])

  return (
    <AudioPlayerContext.Provider value={{
      playingRecordingId,
      playbackSpeed,
      isPlaying: status.playing,
      currentTime: status.currentTime ?? 0,
      duration: status.duration ?? 0,
      loadAndPlay,
      togglePlayback,
      seekTo,
      cycleSpeed,
      close,
    }}>
      {children}
    </AudioPlayerContext.Provider>
  )
}

export function useSharedAudioPlayer() {
  const ctx = useContext(AudioPlayerContext)
  if (!ctx) throw new Error('useSharedAudioPlayer must be used within AudioPlayerProvider')
  return ctx
}
