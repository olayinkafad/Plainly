# Deployment Guide

## Quick Deploy to Vercel (5 minutes)

### Step 1: Prepare

1. **Get OpenAI API Key:**
   - Go to https://platform.openai.com/api-keys
   - Create a new secret key
   - Copy it (you'll need it in step 4)

2. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

### Step 2: Deploy

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```
   
   - Follow the prompts:
     - "Set up and deploy?" → Yes
     - "Which scope?" → Your account
     - "Link to existing project?" → No (first time)
     - "What's your project's name?" → plainly-api (or any name)
     - "In which directory is your code located?" → ./
     - "Want to override the settings?" → No

3. **Note your deployment URL:**
   - Vercel will show: `https://your-project.vercel.app`
   - Your API endpoint will be: `https://your-project.vercel.app/api/process-recording`

### Step 3: Set Environment Variable

1. **Go to Vercel Dashboard:**
   - Visit https://vercel.com/dashboard
   - Click on your project

2. **Add Environment Variable:**
   - Go to Settings → Environment Variables
   - Click "Add New"
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key (starts with `sk-`)
   - Environment: Production, Preview, Development (select all)
   - Click "Save"

3. **Redeploy (if needed):**
   - Go to Deployments tab
   - Click the three dots on latest deployment
   - Click "Redeploy"

### Step 4: Update Your App

1. **Create `.env` file in your app root:**
   ```bash
   cd .. # back to project root
   ```

2. **Add your API URL:**
   ```env
   EXPO_PUBLIC_API_URL=https://your-project.vercel.app/api
   ```

3. **Restart Expo:**
   ```bash
   npx expo start --clear
   ```

### Step 5: Test

1. Record a voice note in the app
2. Select a format
3. It should call your API and generate real output!

## Alternative: Deploy to Railway

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Connect your repository
4. Select the `backend` folder
5. Add environment variable: `OPENAI_API_KEY`
6. Deploy
7. Get your Railway URL and update `EXPO_PUBLIC_API_URL`

## Alternative: Deploy to Render

1. Go to https://render.com
2. New Web Service
3. Connect your repository
4. Settings:
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment: Node
5. Add environment variable: `OPENAI_API_KEY`
6. Deploy
7. Get your Render URL and update `EXPO_PUBLIC_API_URL`

## Testing Your Deployment

Test the health endpoint:
```bash
curl https://your-project.vercel.app/health
```

Should return:
```json
{"status":"ok","message":"Plainly API is running"}
```

Test the API endpoint (replace with your actual file):
```bash
curl -X POST https://your-project.vercel.app/api/process-recording \
  -F "audio=@test-recording.m4a" \
  -F "format=summary"
```

## Troubleshooting

### Deployment fails
- Check that `package.json` is correct
- Ensure Node.js version is 18+ in your platform settings

### API returns 401
- Verify `OPENAI_API_KEY` is set in environment variables
- Check that the key is correct and has credits

### CORS errors
- The server includes CORS middleware
- If issues persist, check your platform's CORS settings

### App can't connect
- Verify `EXPO_PUBLIC_API_URL` is set correctly
- Check that the URL includes `/api` at the end
- For local testing, use ngrok (see backend/README.md)
