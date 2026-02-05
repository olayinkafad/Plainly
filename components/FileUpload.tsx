import { useRef, useState } from 'react'
import { Upload, FileAudio } from 'lucide-react-native'

interface FileUploadProps {
  onFileSelect: (file: File) => void
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = async (file: File) => {
    // Validate file type - only m4a, mp3, wav allowed
    const validExtensions = /\.(m4a|mp3|wav)$/i
    const validTypes = ['audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a']
    
    const isValidType = validTypes.includes(file.type) || validExtensions.test(file.name)
    
    if (!isValidType) {
      alert('Please select a valid audio file (M4A, MP3, or WAV only)')
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB')
      return
    }

    // Validate duration limit (10 minutes = 600 seconds, assuming ~1MB per minute)
    // Note: Actual duration validation should happen server-side after audio processing
    // This is a rough estimate based on file size
    
    onFileSelect(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileChange(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileChange(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  return (
    <div
      className={`border border-dashed rounded-md p-6 transition-colors cursor-pointer ${
        isDragging
          ? 'border-accent-primary bg-bg-secondary'
          : 'border-border-default bg-bg-secondary hover:border-border-default'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/m4a,audio/mp3,audio/mpeg,audio/wav,.m4a,.mp3,.wav"
        onChange={handleInputChange}
        className="hidden"
      />
      <div className="flex flex-col items-center space-y-3">
        <Upload className="w-6 h-6 text-text-secondary" />
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary">
            Upload Audio
          </p>
          <p className="text-xs text-text-secondary mt-1">
            M4A, MP3, or WAV
          </p>
        </div>
      </div>
    </div>
  )
}
