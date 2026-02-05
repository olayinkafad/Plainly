# API Setup Instructions

## Quick Start

### 1. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### 2. Deploy Backend API

#### Option A: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Create a new Next.js project for the API:**
   ```bash
   npx create-next-app@latest plainly-api
   cd plainly-api
   ```

3. **Copy the API function:**
   - Copy `api/process-recording.ts` to `app/api/process-recording/route.ts` in your Next.js project
   - Install dependencies: `npm install openai`

4. **Deploy:**
   ```bash
   vercel
   ```

5. **Set environment variable:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `OPENAI_API_KEY` with your OpenAI API key value

6. **Get your API URL:**
   - Your API will be at: `https://your-project.vercel.app/api/process-recording`

#### Option B: Local Development with ngrok

1. **Create a simple Express server:**
   ```bash
   mkdir plainly-api-server
   cd plainly-api-server
   npm init -y
   npm install express multer openai cors
   ```

2. **Create `server.js`:**
   ```javascript
   const express = require('express');
   const multer = require('multer');
   const OpenAI = require('openai');
   const cors = require('cors');
   
   const app = express();
   app.use(cors());
   const upload = multer({ storage: multer.memoryStorage() });
   
   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
   });
   
   app.post('/api/process-recording', upload.single('audio'), async (req, res) => {
     // Implementation similar to process-recording.ts
     // See api/process-recording.ts for full code
   });
   
   app.listen(3000, () => {
     console.log('Server running on http://localhost:3000');
   });
   ```

3. **Run server:**
   ```bash
   OPENAI_API_KEY=your_key_here node server.js
   ```

4. **Expose with ngrok:**
   ```bash
   npx ngrok http 3000
   ```

5. **Use ngrok URL in app:**
   - Update `EXPO_PUBLIC_API_URL` in your `.env` file

### 3. Configure App

1. **Create `.env` file in project root:**
   ```bash
   EXPO_PUBLIC_API_URL=https://your-api-url.vercel.app/api
   ```

2. **Install expo-constants (if not already installed):**
   ```bash
   npx expo install expo-constants
   ```

3. **Restart Expo:**
   ```bash
   npx expo start --clear
   ```

## Testing

1. Record a voice note in the app
2. Select a format (Summary, Action items, etc.)
3. The app will call your API and generate real output

## Troubleshooting

### "Unable to connect to server"
- Check that your API URL is correct
- Verify the API is deployed and running
- For local development, ensure ngrok is running

### "Invalid API key"
- Verify `OPENAI_API_KEY` is set in your serverless function environment
- Check that the key is correct and has credits

### "No speech detected"
- The recording might be too quiet or empty
- Try recording again with clear speech

## Cost Monitoring

Monitor your OpenAI usage at: https://platform.openai.com/usage

Set up usage limits to prevent unexpected costs.
