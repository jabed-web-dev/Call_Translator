# Arabic Audio Chat Translator — PWA v0.2

A mobile-first Progressive Web App (PWA) for selecting Arabic/English customer audio and showing the transcription plus English and Bengali translations in Messenger-style chat bubbles. Customer appears on the left; Me appears on the right.

## What changed in v0.2
- Installable PWA manifest, icons, service worker, and an Install button when the browser supports it.
- Designed to be hosted on a web server and installed from the phone browser as a home-screen icon.
- The app runs on the server; it does not need to run a Node server on the phone.
- App shell can be cached for quicker opening, but translation requires internet and the hosted server/API.

## Requirements
- Node.js 20+ (Node.js 22 LTS recommended).
- OpenAI API key with API access and billing/credits.
- HTTPS hosting for PWA installation (localhost is also secure for local development).

## Local test
1. Extract the ZIP.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Copy `.env.example` to `.env` and add your API key:
   ```env
   OPENAI_API_KEY=your_real_key_here
   ```
4. Start:
   ```sh
   npm run dev
   ```
5. Open `http://localhost:3000`.

## Deploy to a server
Deploy this repository/project to a Node.js host that supports Node 20+ and environment variables (for example a Node-capable cloud app host or your own VPS).
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variable: `OPENAI_API_KEY` = your real API key
- Optional environment variable: `OPENAI_TRANSLATION_MODEL` = a model available to your OpenAI API account (default in this project: `gpt-5-mini`)
- Optional environment variable: `MAX_AUDIO_MB` = maximum upload size in MB (default 25)
- Set the host's public port using `PORT` if required by that host.
- Enable HTTPS. Do not publish the API key in frontend files or commit `.env`.

## Install on Android
1. Deploy the app to an HTTPS URL, e.g. `https://your-app.example`.
2. Open that URL in Chrome on Android.
3. Open the browser menu (⋮).
4. Choose `Install app` or `Add to Home screen` (wording varies).
5. Confirm. An app icon will appear on the home screen and the app opens in standalone app-like mode.

The Install button appears automatically only in browsers that expose the install prompt. If it does not appear, use the browser menu.

## Folder selection on Android
Browser directory selection is inconsistent on Android. The app offers both a folder picker and a multi-file picker. If your browser does not support selecting a folder, use “Select audio files” and select the recordings you want to process. Browser security usually prevents websites from remembering arbitrary local folder access permanently.

## Audio and privacy
- Audio files are sent to your hosted server, then to OpenAI for transcription. The resulting transcript is sent to the configured translation model.
- Temporary uploaded files are deleted after processing.
- Only upload recordings you have permission to process.
- API usage may incur charges.
- Do not use without adding appropriate authentication/rate limits if you deploy this for private use. The starter includes a basic rate limit, but it is not a complete production security system.
- Transcription and translation may be wrong, especially with noisy audio, overlapping speech, names, addresses, and local dialects.

## Important implementation note
This is a deployable starter project, not a service that has already been uploaded to a public server. You must deploy it to your own hosting provider and configure the API key before it can be installed from a public URL.
