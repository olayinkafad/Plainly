import { OutputType } from '../types'

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
 * Mock processRecording: Returns dummy data for frontend testing
 * TODO: Replace with real API call when backend is ready
 */
export async function processRecording(
  audioUri: string,
  format: OutputType
): Promise<ProcessRecordingResponse> {
  // Simulate API processing delay (1-2 seconds)
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

  // Mock transcript (same for all formats)
  const mockTranscript = `This is a sample transcript of the recording. The user spoke about various topics including project planning, team collaboration, and upcoming deadlines. They mentioned several action items that need to be completed by the end of the week. The discussion covered key points about improving workflow efficiency and communication strategies.`

  // Generate format-specific mock output
  const mockOutputs: Record<OutputType, string> = {
    transcript: mockTranscript,
    
    summary: `This recording covers a discussion about project planning and team collaboration. The conversation focused on improving workflow efficiency, setting deadlines, and enhancing communication strategies. Key themes include project management, team coordination, and productivity improvements.`,
    
    action_items: `1. Complete project planning documentation by Friday
2. Schedule team collaboration meeting for next week
3. Review and update workflow efficiency processes
4. Implement new communication strategy
5. Finalize deadlines for upcoming projects`,
    
    key_points: `• Project planning and team collaboration are priorities
• Workflow efficiency needs improvement
• Communication strategies require enhancement
• Deadlines need to be established and tracked
• Team coordination is essential for success`,
  }

  return {
    transcript: mockTranscript,
    output: mockOutputs[format],
  }
}
