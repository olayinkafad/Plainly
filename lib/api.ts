import { API_ENDPOINTS } from './config'

export interface ProcessRecordingResponse {
  transcript: string
  summary: string
  structuredTranscript: string
  error?: string
}

/**
 * Process a recording through the backend API
 * 1. Sends audio file to backend
 * 2. Backend transcribes with Whisper
 * 3. Backend generates both summary and structured transcript with GPT-4o-mini
 */
export async function processRecording(
  audioUri: string
): Promise<ProcessRecordingResponse> {
  try {
    // Fetch the audio file from the local URI
    const audioResponse = await fetch(audioUri)
    if (!audioResponse.ok) {
      throw new Error('Failed to read audio file')
    }

    // Create FormData with audio file
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

    // No format param — backend generates both summary and transcript

    // Send to backend
    const response = await fetch(API_ENDPOINTS.processRecording, {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        transcript: '',
        summary: '',
        structuredTranscript: '',
        error: data.error || `Server error: ${response.status}`,
      }
    }

    return {
      transcript: data.transcript || '',
      summary: data.summary || '',
      structuredTranscript: data.structuredTranscript || '',
    }
  } catch (error) {
    console.error('Error processing recording:', error)

    if (error instanceof TypeError && error.message.includes('Network')) {
      return {
        transcript: '',
        summary: '',
        structuredTranscript: '',
        error: 'Unable to connect to server. Please check your connection.',
      }
    }

    return {
      transcript: '',
      summary: '',
      structuredTranscript: '',
      error: error instanceof Error ? error.message : 'Failed to process recording',
    }
  }
}

/**
 * Generate a title for a recording based on its content
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
      return 'Recording'
    }

    const data = await response.json()
    return data.title || 'Recording'
  } catch (error) {
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
