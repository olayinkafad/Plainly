# Plainly Backend API

Serverless API for processing audio recordings with OpenAI Whisper and GPT.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 3. Run Locally

```bash
npm run dev
```

Server will run on `http://localhost:3000`

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd backend
   vercel
   ```

4. **Set Environment Variable:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your project
   - Go to Settings → Environment Variables
   - Add `OPENAI_API_KEY` with your OpenAI API key
   - Redeploy if needed

5. **Get Your API URL:**
   - Your API will be at: `https://your-project.vercel.app/api/process-recording`
   - Update `EXPO_PUBLIC_API_URL` in your app's `.env` file

### Option 2: Railway

1. Go to [Railway](https://railway.app)
2. New Project → Deploy from GitHub
3. Connect your repository
4. Set `OPENAI_API_KEY` environment variable
5. Deploy

### Option 3: Render

1. Go to [Render](https://render.com)
2. New Web Service
3. Connect your repository
4. Set build command: `npm install`
5. Set start command: `node server.js`
6. Add `OPENAI_API_KEY` environment variable
7. Deploy

### Option 4: Local Development with ngrok

For testing the app with a local server:

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Expose with ngrok:**
   ```bash
   npx ngrok http 3000
   ```

3. **Use ngrok URL in app:**
   - Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Update `EXPO_PUBLIC_API_URL` in your app's `.env` file:
     ```
     EXPO_PUBLIC_API_URL=https://abc123.ngrok.io
     ```

## API Endpoints

### POST `/api/process-recording`

Process an audio recording and generate the requested format.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `audio`: Audio file (M4A, MP3, WAV, etc.)
  - `format`: One of `transcript`, `summary`, `action_items`, `key_points`

**Response:**
```json
{
  "transcript": "Full transcript text...",
  "output": "Generated format output..."
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/process-recording \
  -F "audio=@recording.m4a" \
  -F "format=summary"
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Plainly API is running"
}
```

## Cost Estimation

- **Whisper API**: ~$0.006 per minute
- **GPT-3.5-turbo**: ~$0.0015 per 1K tokens
- **Example**: 10-minute recording ≈ $0.08 total

Monitor usage at: https://platform.openai.com/usage

## Troubleshooting

### "Invalid API key"
- Verify `OPENAI_API_KEY` is set correctly
- Check that the key has credits available

### "Rate limit exceeded"
- You've hit OpenAI's rate limit
- Wait a moment and try again
- Consider upgrading your OpenAI plan

### "No speech detected"
- Recording might be too quiet or empty
- Try recording again with clear speech

### CORS errors
- The server includes CORS middleware
- If issues persist, check your deployment platform's CORS settings

## Security Notes

- Never commit `.env` file to git
- Keep your OpenAI API key secret
- Consider adding rate limiting for production
- Monitor API usage to prevent unexpected costs
