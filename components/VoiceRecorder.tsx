import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause } from 'lucide-react-native'
import Button from './Button'

interface VoiceRecorderProps {
  onRecordingComplete: (file: File) => void
}

// Maximum recording duration: 10 minutes (600 seconds)
const MAX_DURATION_SECONDS = 600

export default function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        
        // Note: Browser recordings are in WebM format
        // Server-side conversion to m4a/mp3/wav will be handled in the API
        // For MVP, we send WebM and convert on the server
        const file = new File([blob], `recording-${Date.now()}.webm`, {
          type: 'audio/webm',
        })
        onRecordingComplete(file)

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev: number) => {
          const newTime = prev + 1
          // Auto-stop at max duration
          if (newTime >= MAX_DURATION_SECONDS) {
            stopRecording()
            return MAX_DURATION_SECONDS
          }
          return newTime
        })
      }, 1000)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      alert('Unable to access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      timerRef.current = setInterval(() => {
        setRecordingTime((prev: number) => {
          const newTime = prev + 1
          // Auto-stop at max duration
          if (newTime >= MAX_DURATION_SECONDS) {
            stopRecording()
            return MAX_DURATION_SECONDS
          }
          return newTime
        })
      }, 1000)
    }
  }

  return (
    <div className="border border-border-default rounded-md p-6 bg-bg-secondary">
      <div className="flex flex-col items-center space-y-4">
        {!isRecording && !audioBlob ? (
          <>
            <Button variant="primary" fullWidth onClick={startRecording}>
              <Mic className="w-5 h-5" />
              <span>Record</span>
            </Button>
          </>
        ) : isRecording ? (
          <div className="w-full space-y-4">
            <div className="text-center">
              <p className={`text-lg font-medium ${
                recordingTime >= MAX_DURATION_SECONDS - 30
                  ? 'text-status-error'
                  : 'text-text-primary'
              }`}>
                {formatTime(recordingTime)}
              </p>
              {recordingTime >= MAX_DURATION_SECONDS - 30 && (
                <p className="text-xs text-status-error mt-2">
                  Max: {formatTime(MAX_DURATION_SECONDS)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {!isPaused ? (
                <Button
                  variant="secondary"
                  onClick={pauseRecording}
                  className="flex-1"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={resumeRecording}
                  className="flex-1"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume</span>
                </Button>
              )}
              <Button
                variant="primary"
                onClick={stopRecording}
                className="flex-1"
                style={{ backgroundColor: 'var(--color-status-error)' }}
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
