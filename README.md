# Plainly

A mobile-first web application that converts voice notes into clear, structured text based on user intent. The app focuses on interpretation, not raw transcription.

## Features

- 🎤 **Voice Recording**: Record voice notes directly in the browser
- 📤 **File Upload**: Upload existing audio files (MP3, WAV, WebM, OGG, M4A)
- 🎯 **Output Types**: Choose from multiple structured formats:
  - Summary
  - Meeting Notes
  - Action Items
  - Bullet Points
  - Email
  - Todo List
- 📋 **Copy & Share**: Easily copy or share the structured text
- 📱 **Mobile-First**: Optimized for mobile devices with responsive design

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
Plainly/
├── app/
│   ├── api/
│   │   └── transcribe/
│   │       └── route.ts      # API endpoint for transcription
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page
├── components/
│   ├── FileUpload.tsx        # File upload component
│   ├── OutputTypeSelector.tsx # Output format selector
│   ├── ResultDisplay.tsx     # Result display component
│   └── VoiceRecorder.tsx     # Voice recording component
└── ...
```

## Integration with Transcription Services

The app currently includes a mock transcription service. To integrate with a real service:

1. **OpenAI Whisper + GPT-4** (Recommended):
   - Use Whisper API for transcription
   - Use GPT-4 to interpret and structure based on output type
   - Add your API key to environment variables

2. **Other Options**:
   - AssemblyAI
   - Deepgram
   - Google Speech-to-Text
   - Azure Speech Services

Update `/app/api/transcribe/route.ts` to integrate with your chosen service.

## Environment Variables

Create a `.env.local` file for API keys:

```env
OPENAI_API_KEY=your_api_key_here
# or
ASSEMBLYAI_API_KEY=your_api_key_here
```

## Building for Production

```bash
npm run build
npm start
```

## License

MIT
