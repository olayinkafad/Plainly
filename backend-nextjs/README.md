# Plainly Backend

Next.js API backend for the Plainly app. Handles audio transcription (Whisper) and AI-powered summarization (GPT-4o-mini).

## Setup

### 1. Install dependencies

```bash
cd backend-nextjs
npm install
```

### 2. Add your OpenAI API key

Create a `.env.local` file in this directory:

```bash
echo "OPENAI_API_KEY=sk-your-key-here" > .env.local
```

Replace `sk-your-key-here` with your actual OpenAI API key from https://platform.openai.com/api-keys

## Running the Backend

### Start the server

```bash
npm run dev
```

The server runs on **http://localhost:3001**

### Stop the server

Press `Ctrl+C` in the terminal

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/process-recording` | POST | Transcribe audio and generate outputs (summary, action items, transcript) |
| `/api/generate-title` | POST | Generate a title for a recording based on its content |

## Testing on Physical Device

If testing the Expo app on a physical phone (not simulator), update the API URL in `/lib/config.ts`:

```typescript
const DEV_API_URL = 'http://YOUR_MACHINE_IP:3001'
```

Find your IP with: `ipconfig getifaddr en0` (Mac)

## Troubleshooting

**Backend not responding?**
- Make sure the server is running (`npm run dev`)
- Check if port 3001 is available

**OpenAI errors?**
- Verify your API key in `.env.local`
- Check your OpenAI billing at https://platform.openai.com/account/billing

**Connection errors?**
- The app uses native `https` module for Whisper (due to node-fetch issues on Node 24)
- If you see `ECONNRESET`, check your internet connection
