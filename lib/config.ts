// API Configuration for Plainly
// Priority order:
// 1) EXPO_PUBLIC_API_URL (if set) for both dev and production
// 2) localhost fallback in dev
// 3) placeholder fallback in production
const DEV_FALLBACK_API_URL = 'http://localhost:3001'
const PROD_FALLBACK_API_URL = 'https://plainly-one.vercel.app'

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim()
const NORMALIZED_ENV_API_URL = ENV_API_URL
  ? ENV_API_URL.replace(/\/+$/, '')
  : undefined

export const API_BASE_URL =
  NORMALIZED_ENV_API_URL || (__DEV__ ? DEV_FALLBACK_API_URL : PROD_FALLBACK_API_URL)

export const API_ENDPOINTS = {
  processRecording: `${API_BASE_URL}/api/process-recording`,
  transcribe: `${API_BASE_URL}/api/transcribe`,
  generateOutputs: `${API_BASE_URL}/api/generate-outputs`,
  generateTitle: `${API_BASE_URL}/api/generate-title`,
}
