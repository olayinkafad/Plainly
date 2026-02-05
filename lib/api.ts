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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/api.ts:99',message:'generateRecordingTitle entry',data:{hasTranscript:!!transcript,hasSummary:!!summary,transcriptLength:transcript?.length,summaryLength:summary?.length,apiBaseUrl:API_BASE_URL,generateTitleEndpoint:API_ENDPOINTS.generateTitle},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
  // #endregion
  try {
    if (!transcript && !summary) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/api.ts:105',message:'No content available',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return 'Quick note'
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/api.ts:108',message:'Before fetch call',data:{endpoint:API_ENDPOINTS.generateTitle,method:'POST'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D'})}).catch(()=>{});
    // #endregion
    console.log('Calling generate-title endpoint:', API_ENDPOINTS.generateTitle)
    const response = await fetch(API_ENDPOINTS.generateTitle, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript, summary }),
    })

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/api.ts:117',message:'After fetch response',data:{status:response.status,statusText:response.statusText,ok:response.ok,url:response.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D'})}).catch(()=>{});
    // #endregion
    console.log('Generate-title response status:', response.status)
    if (!response.ok) {
      const errorText = await response.text()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/api.ts:120',message:'Response not OK',data:{status:response.status,errorTextPreview:errorText.substring(0,200),isHtml:errorText.includes('<!DOCTYPE'),isNextJs:errorText.includes('_next')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Generate-title failed:', response.status, errorText)
      // Silently fail - return fallback title
      return 'Recording'
    }

    const data = await response.json()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/api.ts:125',message:'Success response',data:{title:data.title},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.log('Generate-title response data:', data)
    return data.title || 'Recording'
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/api.ts:128',message:'Exception caught',data:{errorMessage:error?.message,errorName:error?.name,errorType:typeof error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
    console.error('Error generating title:', error)
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
