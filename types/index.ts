export type OutputType = 'summary' | 'transcript'

export interface TranscriptSegment {
  speaker: string
  text: string
  start: number // Start time in seconds
  end: number // End time in seconds
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

export interface SummaryKeyPoint {
  lead: string
  detail: string
}

export interface StructuredSummary {
  format: 'summary'
  gist: string
  key_points: SummaryKeyPoint[]
  follow_ups?: string[]
  confidence_notes: SummaryConfidenceNotes
}

export type SummaryOutput = string | StructuredSummary
