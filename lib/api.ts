import { OutputType } from '../types'
import { API_BASE_URL, API_ENDPOINTS } from './config'

export interface ProcessRecordingRequest {
  audioUri: string
  format: OutputType
}

export interface ProcessRecordingResponse {
  transcript: string
  output: string
  error?: string
}

/**
 * Process a recording through the backend API
 * 1. Sends audio file to backend
 * 2. Backend transcribes with Whisper
 * 3. Backend generates structured output with GPT-4o-mini
 */
export async function processRecording(
  audioUri: string,
  format: OutputType
): Promise<ProcessRecordingResponse> {
  try {
    // Fetch the audio file from the local URI
    const audioResponse = await fetch(audioUri)
    if (!audioResponse.ok) {
      throw new Error('Failed to read audio file')
    }

    const audioBlob = await audioResponse.blob()

    // Create FormData with audio file and format
    const formData = new FormData()

    // Determine file extension from URI or default to m4a (iOS default)
    const extension = audioUri.split('.').pop()?.toLowerCase() || 'm4a'
    const mimeType = getMimeType(extension)
    const filename = `recording.${extension}`

    // Append the audio file
    formData.append('audio', {
      uri: audioUri,
      type: mimeType,
      name: filename,
    } as any)

    formData.append('format', format)

    // Send to backend
    const response = await fetch(API_ENDPOINTS.processRecording, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - let fetch set it with boundary for FormData
      },
    })

    const data = await response.json()

    if (!response.ok) {
      // Return error in the expected format
      return {
        transcript: '',
        output: '',
        error: data.error || `Server error: ${response.status}`,
      }
    }

    return {
      transcript: data.transcript || '',
      output: data.output || '',
    }
  } catch (error) {
    console.error('Error processing recording:', error)

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Network')) {
      return {
        transcript: '',
        output: '',
        error: 'Unable to connect to server. Please check your connection.',
      }
    }

    return {
      transcript: '',
      output: '',
      error: error instanceof Error ? error.message : 'Failed to process recording',
    }
  }
}

/**
 * Generate a title for a recording based on its content
 * Uses transcript or summary to generate a short, human-friendly title
 */
export async function generateRecordingTitle(
  transcript?: string,
  summary?: string
): Promise<string> {
  try {
    if (!transcript && !summary) {
      return 'Quick note'
    }

    const response = await fetch(API_ENDPOINTS.generateTitle, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript, summary }),
    })

    if (!response.ok) {
      // Silently fail - return fallback title
      return 'Recording'
    }

    const data = await response.json()
    return data.title || 'Recording'
  } catch (error) {
    // Silently fail - return fallback title
    return 'Recording'
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    m4a: 'audio/m4a',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
  }
  return mimeTypes[extension] || 'audio/m4a'
}
