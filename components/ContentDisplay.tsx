import { useState, useEffect, useRef } from 'react'
import { Copy, Share2, CheckCircle2 } from 'lucide-react-native'

interface ContentDisplayProps {
  content: string
  isProcessing: boolean
  onCopy: () => void
  onShare: () => void
  copied: boolean
}

export default function ContentDisplay({
  content,
  isProcessing,
  onCopy,
  onShare,
  copied,
}: ContentDisplayProps) {
  const [isVisible, setIsVisible] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fade transition when content changes
    setIsVisible(false)
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 150)
    return () => clearTimeout(timer)
  }, [content])

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text-secondary">Generating...</p>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text-secondary">No content available</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Action buttons - floating top right */}
      <div className="flex justify-end gap-2 mb-4">
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
          onClick={onShare}
          className="p-2 rounded-md bg-bg-secondary hover:opacity-80 transition-opacity"
          title="Share"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <Share2 className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      {/* Content with fade transition */}
      <div
        ref={contentRef}
        className="max-w-none"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 200ms ease-out',
        }}
      >
        <div 
          className="text-text-primary whitespace-pre-wrap break-words"
          style={{
            fontSize: 'var(--font-size-sm, 14px)',
            lineHeight: '1.6',
            maxWidth: '100%',
          }}
        >
          {content}
        </div>
      </div>
    </div>
  )
}
