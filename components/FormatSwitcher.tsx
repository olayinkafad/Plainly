import { OutputType } from '../types'

interface FormatSwitcherProps {
  activeFormat: OutputType
  onFormatChange: (format: OutputType) => void
  availableFormats?: OutputType[]
}

const formatOptions: { value: OutputType; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'action_items', label: 'Action items' },
  { value: 'key_points', label: 'Key points' },
  { value: 'transcript', label: 'Transcript' },
]

export default function FormatSwitcher({
  activeFormat,
  onFormatChange,
  availableFormats,
}: FormatSwitcherProps) {
  const formatsToShow = availableFormats || formatOptions.map((f) => f.value)

  return (
    <div className="bg-bg-primary border-b border-border-subtle w-full">
      <div className="flex overflow-x-auto scrollbar-hide w-full">
        {formatOptions
          .filter((opt) => formatsToShow.includes(opt.value))
          .map((option) => (
            <button
              key={option.value}
              onClick={() => onFormatChange(option.value)}
              className={`flex-shrink-0 font-medium transition-colors border-b-2 ${
                activeFormat === option.value
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
              style={{
                paddingLeft: 'var(--space-3, 12px)',
                paddingRight: 'var(--space-3, 12px)',
                paddingTop: 'var(--space-2, 8px)',
                paddingBottom: 'var(--space-2, 8px)',
                fontSize: 'var(--font-size-sm, 14px)',
                borderBottomWidth: '2px',
              }}
            >
              {option.label}
            </button>
          ))}
      </div>
    </div>
  )
}
