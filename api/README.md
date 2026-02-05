# API Setup Guide

This directory contains the serverless function for processing audio recordings.

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd api
   vercel
   ```

3. **Set Environment Variable:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `OPENAI_API_KEY` with your OpenAI API key

4. **Update API URL in app:**
   - Get your deployment URL from Vercel
   - Update `EXPO_PUBLIC_API_URL` in your `.env` file

### Option 2: Netlify Functions

1. Create `netlify.toml` in project root:
   ```toml
   [build]
     functions = "api"
   
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

2. Rename `process-recording.ts` to `process-recording.js` and convert to CommonJS

3. Deploy to Netlify

### Option 3: AWS Lambda

1. Use Serverless Framework or AWS SAM
2. Package the function
3. Deploy to Lambda
4. Set up API Gateway

## Local Development

1. **Install dependencies:**
   ```bash
   npm install openai
   ```

2. **Set environment variable:**
   ```bash
   export OPENAI_API_KEY=your_key_here
   ```

3. **Run local server:**
   - For Next.js: `npm run dev`
   - For standalone: Use a simple Express server

## Environment Variables

- `OPENAI_API_KEY` (required): Your OpenAI API key

## Cost Estimation

- Whisper API: ~$0.006 per minute
- GPT-3.5-turbo: ~$0.0015 per 1K tokens
- Example: 10-minute recording ≈ $0.08 total

## Testing

Use a tool like Postman or curl:

```bash
curl -X POST http://localhost:3000/api/process-recording \
  -F "audio=@recording.m4a" \
  -F "format=summary"
```
