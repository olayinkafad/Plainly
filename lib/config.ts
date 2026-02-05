// API Configuration for Plainly
// In development, the backend runs on localhost:3001
// In production, set EXPO_PUBLIC_API_URL to your deployed backend URL

// For physical device testing, replace 'localhost' with your machine's local IP
// e.g., 'http://192.168.1.100:3001'
const DEV_API_URL = 'http://localhost:3001'

export const API_BASE_URL = __DEV__
  ? DEV_API_URL
  : process.env.EXPO_PUBLIC_API_URL || 'https://your-production-url.com'

export const API_ENDPOINTS = {
  processRecording: `${API_BASE_URL}/api/process-recording`,
}
