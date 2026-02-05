export type OutputType = 
  | 'action_items'
  | 'summary'
  | 'key_points'
  | 'transcript'

export interface TranscriptSegment {
  speaker: string
  text: string
}

export interface TranscriptConfidenceNotes {
  possible_missed_words: boolean
  mixed_language_detected: boolean
  noisy_audio_suspected: boolean
  reason: string | null
}

export interface StructuredTranscript {
  format: 'transcript'
  language_detected: string
  speaker_separation: 'provided' | 'not_available'
  segments: TranscriptSegment[]
  confidence_notes: TranscriptConfidenceNotes
}

export type TranscriptOutput = string | StructuredTranscript

export interface SummaryConfidenceNotes {
  possible_missed_words: boolean
  mixed_language_detected: boolean
  noisy_audio_suspected: boolean
  reason: string | null
}

export interface StructuredSummary {
  format: 'summary'
  language_detected: string
  one_line: string
  key_takeaways: string[]
  context: string | null
  confidence_notes: SummaryConfidenceNotes
}

export type SummaryOutput = string | StructuredSummary
