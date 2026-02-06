import { useState, useRef, useEffect } from 'react'
import { Copy, Share2, ArrowLeft, CheckCircle2, Download, Play, Pause } from 'lucide-react-native'
import Button from './Button'
import { OutputType } from '../types'

interface ResultDisplayProps {
  result: string
  activeFormat: OutputType
  audioUrl: string | null
  audioDuration?: number
  onCopy: () => void
  onShare: () => void
  onBack: () => void
  onReset: () => void
  onFormatChange: (format: OutputType) => void
  copied: boolean
}

const formatLabels: Record<OutputType, string> = {
  summary: 'Summary',
  action_items: 'Action items',
  transcript: 'Transcript',
}

export default function ResultDisplay({
  result,
  activeFormat,
  audioUrl,
  audioDuration = 0,
  onCopy,
  onShare,
  onBack,
  onReset,
  onFormatChange,
  copied,
}: ResultDisplayProps) {
  const allFormats: OutputType[] = ['summary', 'action_items', 'transcript']
  const secondaryFormats = allFormats.filter((f) => f !== activeFormat)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentDuration, setCurrentDuration] = useState(audioDuration)
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

  const handleDownload = () => {
    // Stub for download functionality
    const blob = new Blob([result], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plainly-result-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Top navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Plainly</span>
      </button>

      {/* Title and subtitle */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-text-primary mb-1">
          {formatLabels[activeFormat]}
        </h2>
        <p className="text-xs text-text-secondary">
          Generated from your recording
        </p>
      </div>

      {/* Audio preview */}
      {audioUrl && (
        <div className="bg-bg-secondary rounded-md p-4 mb-6">
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
                  Recording
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
      )}

      {/* Generated content */}
      <div className="bg-bg-primary border border-border-default rounded-md p-6">
        <div className="flex items-center justify-end mb-4">
          <div className="flex gap-2">
            <button
              onClick={onCopy}
              className="p-2 rounded-md bg-bg-secondary hover:opacity-80 transition-opacity"
              title="Copy"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              {copied ? (
                <CheckCircle2 className="w-5 h-5 text-status-success" />
              ) : (
                <Copy className="w-5 h-5 text-text-secondary" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-md bg-bg-secondary hover:opacity-80 transition-opacity"
              title="Download"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <Download className="w-5 h-5 text-text-secondary" />
            </button>
            <button
              onClick={onShare}
              className="p-2 rounded-md bg-bg-secondary hover:opacity-80 transition-opacity"
              title="Share"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <Share2 className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-md p-4 max-h-[60vh] overflow-y-auto">
          <textarea
            readOnly
            value={result}
            className="w-full bg-transparent text-sm text-text-primary font-regular resize-none border-none outline-none"
            rows={10}
            style={{ minHeight: '200px' }}
          />
        </div>
      </div>

      {/* Secondary format actions */}
      {secondaryFormats.length > 0 && (
        <div className="bg-bg-secondary rounded-md p-4 border border-border-subtle">
          <h3 className="text-sm font-medium text-text-primary mb-3">
            Want a different version?
          </h3>
          <div className="flex flex-wrap gap-2">
            {secondaryFormats.map((format) => (
              <button
                key={format}
                onClick={() => onFormatChange(format)}
                className="px-4 py-2 rounded-full text-sm font-medium text-text-primary bg-bg-primary border border-border-default hover:border-accent-primary hover:text-accent-primary transition-colors"
              >
                View as {formatLabels[format]}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button variant="secondary" fullWidth onClick={onReset}>
        <ArrowLeft className="w-5 h-5" />
        <span>New Recording</span>
      </Button>
    </div>
  )
}
