import { OutputType } from '../types'

interface OutputTypeSelectorProps {
  value: OutputType
  onChange: (type: OutputType) => void
}

const outputTypes: { value: OutputType; label: string; description: string }[] = [
  {
    value: 'action_items',
    label: 'Action Items',
    description: 'Extract tasks and responsibilities',
  },
  {
    value: 'summary',
    label: 'Summary',
    description: 'Concise overview of key points',
  },
  {
    value: 'notes',
    label: 'Notes',
    description: 'Structured notes format',
  },
]

export default function OutputTypeSelector({ value, onChange }: OutputTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text-primary">
        Output Format
      </label>
      <div className="space-y-2">
        {outputTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => onChange(type.value)}
            className={`w-full p-4 rounded-md border text-left transition-colors ${
              value === type.value
                ? 'border-accent-primary bg-bg-secondary'
                : 'border-border-default bg-bg-primary hover:bg-bg-secondary'
            }`}
            style={{ minHeight: '44px' }}
          >
            <div className="text-sm font-medium text-text-primary">
              {type.label}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              {type.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
