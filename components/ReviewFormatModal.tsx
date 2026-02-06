import { useState, useEffect, useRef } from 'react'
import { Play, Pause } from 'lucide-react-native'
import Button from './Button'
import { OutputType } from '../types'

interface ReviewFormatModalProps {
  isOpen: boolean
  audioUrl: string | null
  audioDuration?: number
  onGenerate: (format: OutputType) => void
  onRecordAgain: () => void
}

const formatOptions: { value: OutputType; label: string; helper: string }[] = [
  {
    value: 'summary',
    label: 'Summary',
    helper: 'A short, clear overview',
  },
  {
    value: 'action_items',
    label: 'Action items',
    helper: 'Tasks and next steps',
  },
  {
    value: 'transcript',
    label: 'Transcript',
    helper: 'Word-for-word text',
  },
]

export default function ReviewFormatModal({
  isOpen,
  audioUrl,
  audioDuration = 0,
  onGenerate,
  onRecordAgain,
}: ReviewFormatModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<OutputType | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentDuration, setCurrentDuration] = useState(audioDuration)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Set Summary as default selection
      setSelectedFormat('summary')
      setIsPlaying(false)
      // Trigger animation after mount
      requestAnimationFrame(() => {
        setIsVisible(true)
      })
      // Update duration when audio loads
      if (audioRef.current) {
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            setCurrentDuration(audioRef.current.duration)
          }
        })
      }
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
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
      if (audioRef.current.ended) {
        setIsPlaying(false)
      }
    }
  }

  const handleGenerate = () => {
    if (selectedFormat) {
      onGenerate(selectedFormat)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Dimmed background overlay */}
      <div
        className="fixed inset-0 bg-black z-50 transition-opacity duration-300"
        style={{
          opacity: isVisible ? 0.5 : 0,
        }}
      />

      {/* Review modal/sheet */}
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center pointer-events-none"
        style={{
          minHeight: '100svh',
          minHeight: '100vh', // Fallback
        }}
      >
        <div
          className="bg-bg-primary rounded-t-2xl w-full max-w-[420px] flex flex-col pointer-events-auto overflow-y-auto"
          style={{
            transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 300ms ease-out',
            maxHeight: '90vh',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          }}
        >
          {/* Audio preview */}
          <div className="px-6 pt-6 pb-4">
            <div className="bg-bg-secondary rounded-md p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePlayPause}
                  className="flex-shrink-0 w-12 h-12 rounded-full bg-accent-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity"
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
                    <span className="text-sm font-medium text-text-primary">
                      Recording preview
                    </span>
                    <span className="text-xs text-text-secondary">
                      {formatTime(Math.floor(currentDuration || audioDuration))}
                    </span>
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
                  <div className="w-full h-1 bg-border-default rounded-full mt-2">
                    <div
                      className="h-full bg-accent-primary rounded-full transition-all duration-100"
                      style={{
                        width: audioRef.current
                          ? `${(audioRef.current.currentTime / audioRef.current.duration) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Format selection */}
          <div className="px-6 pb-6 flex-1">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                What do you want this to become?
              </h2>
              <p className="text-sm text-text-secondary">
                Choose one format to generate first.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {formatOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedFormat(option.value)}
                  className={`w-full p-4 rounded-md border text-left transition-all ${
                    selectedFormat === option.value
                      ? 'border-accent-primary bg-bg-secondary'
                      : 'border-border-default bg-bg-primary hover:bg-bg-secondary'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {option.label}
                      </div>
                      <div className="text-xs text-text-secondary mt-1">
                        {option.helper}
                      </div>
                    </div>
                    {selectedFormat === option.value && (
                      <div className="w-5 h-5 rounded-full bg-accent-primary flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                onClick={handleGenerate}
                disabled={!selectedFormat}
              >
                Generate
              </Button>
              <button
                onClick={onRecordAgain}
                className="w-full text-sm text-text-secondary hover:text-text-primary transition-colors font-medium py-2"
              >
                Record again
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
