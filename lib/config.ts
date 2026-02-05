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
  generateTitle: `${API_BASE_URL}/api/generate-title`,
}

// #region agent log
if (typeof fetch !== 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/833c2d22-556f-4cb3-8e85-89df33b7ba86',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/config.ts:16',message:'API config loaded',data:{apiBaseUrl:API_BASE_URL,isDev:__DEV__,generateTitleEndpoint:API_ENDPOINTS.generateTitle},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
}
// #endregion
