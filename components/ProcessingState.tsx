import { Loader2 } from 'lucide-react-native'

interface ProcessingStateProps {
  format: string
}

export default function ProcessingState({ format }: ProcessingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <Loader2 className="w-12 h-12 text-accent-primary animate-spin mb-6" />
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Turning your voice into clear text...
      </h2>
      <p className="text-sm text-text-secondary text-center">
        Generating {format.toLowerCase()}
      </p>
    </div>
  )
}
