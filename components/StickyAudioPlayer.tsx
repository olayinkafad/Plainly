import { useState, useRef, useEffect } from 'react'
import { Play, Pause } from 'lucide-react-native'

interface StickyAudioPlayerProps {
  audioUrl: string
  duration: number
}

export default function StickyAudioPlayer({
  audioUrl,
  duration,
}: StickyAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentDuration, setCurrentDuration] = useState(duration)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          setCurrentDuration(audioRef.current.duration)
        }
      })
    }
  }, [audioUrl])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      if (audioRef.current.ended) {
        setIsPlaying(false)
      }
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * audioRef.current.duration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  return (
    <div 
      className="bg-bg-secondary border-b border-border-subtle w-full"
      style={{
        paddingLeft: 'var(--space-4, 16px)',
        paddingRight: 'var(--space-4, 16px)',
        paddingTop: 'var(--space-3, 12px)',
        paddingBottom: 'var(--space-3, 12px)',
      }}
    >
      <div className="flex items-center gap-4 w-full">
        <button
          onClick={handlePlayPause}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-secondary">
              {formatTime(currentTime)}
            </span>
            <span className="text-xs text-text-secondary">
              {formatTime(currentDuration || duration)}
            </span>
          </div>
          <div
            className="w-full h-1.5 bg-border-default rounded-full cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-accent-primary rounded-full transition-all duration-100"
              style={{
                width: audioRef.current && audioRef.current.duration
                  ? `${(currentTime / audioRef.current.duration) * 100}%`
                  : '0%',
              }}
            />
          </div>
        </div>
      </div>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setCurrentDuration(audioRef.current.duration)
            }
          }}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  )
}
