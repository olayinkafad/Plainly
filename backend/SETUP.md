# Backend Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

**Important:** Replace `your_openai_api_key_here` with your actual OpenAI API key.

You can get an API key from: https://platform.openai.com/api-keys

### 3. Start the Server

```bash
npm run dev
```

Or:

```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

### 4. Verify Server is Running

Open your browser and visit: `http://localhost:3000/health`

You should see:
```json
{
  "status": "ok",
  "message": "Plainly API is running"
}
```

## Troubleshooting

### "Cannot find module" errors

If you see errors about missing modules, run:
```bash
npm install
```

### "OPENAI_API_KEY not configured" warning

Make sure you've created a `.env` file in the `backend` directory with your API key.

### Port already in use

If port 3000 is already in use, you can change it by adding to your `.env`:
```
PORT=3001
```

### Connection refused from frontend

- Make sure the server is running (`npm run dev`)
- For iOS Simulator, the frontend is configured to use `http://127.0.0.1:3000/api`
- For physical devices, you'll need to use your computer's IP address or ngrok

## API Endpoints

### Health Check
- **GET** `/health`
- Returns server status

### Process Recording
- **POST** `/api/process-recording`
- Accepts: `multipart/form-data` with `audio` file and optional `format` parameter
- Formats: `transcript`, `summary` (or omit for both)
- Returns: `{ transcript, summary, structuredTranscript }` (dual) or `{ transcript, output }` (single)
