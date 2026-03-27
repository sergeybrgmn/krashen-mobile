# Krashen Mobile App - Functional Specification

> Use this document as the complete instruction set for building the Krashen mobile app as a React Native / Expo iOS app. It describes every screen, component, user flow, API contract, and behavioral detail.

---

## 1. App Overview

Krashen is an interactive podcast learning app.
Users browse podcasts, listen to episodes, and can in any moment pause and see the explanation of somey non-trivial words or multi-word expression for the current slice of the transcript.
User just has to click in the word to see the explanation details.

The additional scenario allos to ask spoken questions at any point during playback.
The app records the user's voice, sends it to a backend API along with the current playback timestamp, and receives an AI-generated text answer.

---

## 2. Screens

The app has 3 screens:

1. **Podcast Selection (Home)** - browse podcasts, pick episode
2. **Player** - audio playback, voice question recording, transcript, answers
3. **About** - static markdown help page

---

## 3. Screen 1: Podcast Selection (Home)

### Layout (top to bottom)

1. **Info banner** - a tappable link to the About screen, small text like "What is Krashen?"
2. **Page title** - "Podcasts"
3. **Language filter dropdown** - filters the podcast list by language
4. **Podcast horizontal scroll list** - cards showing podcast cover + title
5. **Episodes section** - appears when a podcast is selected, shows episode list

### Data & API

**On mount**, fetch all podcasts:
```
GET /api/podcasts
Response: Array of objects:
  { id: string (UUID), title: string, cover_url: string, language: string }
```

**When a podcast is selected**, fetch its episodes:
```
GET /api/podcast/{podcastId}/episodes
Response: Array of objects:
  { id: string (UUID), title: string, audio_url: string | null }
```

### Podcast Language Filter

- A dropdown at the top with language options derived from the podcasts' `language` field
- Only shows languages that exist in the podcast list
- Default filter: no filters
- Language codes are normalized to lowercase for comparison
- Language names come from a static `LANGUAGES` list (84 entries, ISO 639-1 codes mapped to English names, e.g. `{ code: 'es', name: 'Spanish' }`)
- Changing the filter re-filters the visible podcasts; if the currently selected podcast is filtered out, clear the selection

### Podcast Cards

- Horizontal scrolling row
- Each card: 140px wide, square cover image (1:1 aspect ratio) + title below (2-line clamp)
- Placeholder shown if cover_url missing
- Selected card has a cyan outline (3px solid)
- Tap selects the podcast and triggers episode fetch

### Episode List

- When no podcast selected: "Select a podcast to see episodes."
- When loading: "Loading episodes..."
- When loaded: header shows episode count (e.g. "12 episodes"), then a flex-wrap list of pill-shaped buttons, one per episode, showing episode title
- When no episodes: "No episodes"

### Answer Language Selection

When the user taps an episode, before navigating to the Player, the app may need to ask which language the AI should answer in:

**Answer language rules** (hardcoded):
```
es (Spanish podcasts)  -> answer options: en
en (English podcasts)  -> answer options: es
fr (French podcasts)   -> answer options: en
default (others)       -> answer options: en
```

Also we now should let to listen only after Auth.

**Logic:**
1. The last-used answer language is persisted in local storage (key: `krashen-answer-language`)
2. On episode tap, check if the stored answer language is valid for the selected podcast's language
3. If valid -> navigate directly to Player
4. If not valid (or not set) -> show a modal asking the user to pick from the allowed languages
5. Modal has: title "Choose the language for answers:", a dropdown of allowed language options, Cancel and Confirm buttons
6. On confirm, save the selected language to storage, then navigate

### Navigation to Player

Navigate to the Player screen passing:
- `podcastId` (string UUID)
- `episodeId` (string UUID)
- `targetLanguage` (string language code, e.g. `"en"`)

---

## 4. Screen 2: Player

### Layout (top to bottom)

1. **Header section**
   - "Back to episodes" button (navigates back to Home)
   - Podcast name (small, uppercase, muted text, letter-spacing 0.18em)
   - Episode title (large, responsive font)

2. **Playback card** - the main audio player UI
3. **Ask / Recording controls** - the voice question interface
4. **Response panel** - transcript segments + answer text (conditional)
5. **Modals** - word explanation modal, error/auth modal (overlays)

### Data Loading

On mount (and when podcastId/episodeId change), fetch:
```
GET /api/podcasts         -> find podcast by podcastId
GET /api/podcast/{podcastId}/episodes  -> find episode by episodeId
```
These two calls run in parallel. Extract the matching podcast and episode objects. The episode object provides `audio_url` for playback and `title` for display.

Separately, load transcript/explanation data:
```
GET /api/episode/{episodeId}/data?target_language={targetLanguage}
Response: {
  segments: Array of { start: number, end: number, text: string },
  explanations: {
    "0": { words: [...] },
    "1": { words: [...] },
    ...
  }
}
```
- `segments` is an array of transcript segments with start/end timestamps (in seconds) and text
- `explanations` is keyed by segment index (as string), each containing a `words` array

Each word object in the explanations:
```
{
  surface: string,      // the word as it appears in text
  start_char: number,   // character position start in segment text
  end_char: number,     // character position end in segment text
  translation: string,  // translation to target language
  pos: string,          // part of speech
  meaning: string,      // definition
  pattern: string,      // grammar pattern
  usage_notes: string,  // usage guidance
  example: string       // example sentence
}
```

### Playback Card

Contains three sections:

#### Transport Controls (centered row)
- **Rewind button**: label "-15s", skips back 15 seconds
- **Play/Pause button**: large circular button (88px on desktop, 72px on small screens), cyan gradient. Shows play triangle icon when paused, pause bars icon when playing
- **Forward button**: label "+15s", skips forward 30 seconds
- All buttons disabled when no audio URL available

#### Timeline / Progress Bar
- 3-column layout: [current time] [progress track] [total duration]
- Time format: `M:SS` or `H:MM:SS` (e.g. "2:34" or "1:02:15")
- Track has 3 visual layers:
  1. Background (dark, 10px height)
  2. Buffered region (semi-transparent blue, width = buffered percentage)
  3. Progress indicator (cyan gradient, width = playback percentage)
- Scrubbing: user can drag/tap anywhere on the track to seek
- Disabled when audio not loaded or duration unknown

#### Playback Footer
- Left side (conditional messages):
  - "Episode audio unavailable." (when no audio URL)
  - "Loading audio..." (when audio URL exists but not yet loaded)
- Right side: **Speed control**
  - Label "Speed" + dropdown select
  - Options: 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x
  - Default: 1x, resets to 1x when episode changes
  - Applies immediately to audio playback

### Ask / Recording Controls

Three states:

#### State 1: Idle (not recording, not submitting)
- **"Ask" button**: pill-shaped, cyan gradient, microphone icon + "Ask" text
  - Full width on small screens, min-width 180px on larger
  - Disabled when: no episodeId, or currently submitting a question
  - On tap:
    1. If user not signed in -> trigger Clerk (will need to use some mobile native sdk) sign-in flow, then return (don't record)
    2. Pause audio playback
    3. Request microphone permission (reuse existing stream if available, but maybe can be done different way for mobile natove app with mic persmission)
    4. Start MediaRecorder with 750ms timeslice
    5. Transition to "Listening" state

#### State 2: Listening (recording active)
- A horizontal bar with three elements:
  - **Cancel button** (left): circular 48px, X icon. Discards recording.
  - **Listening indicator** (center): orange pulsing dot + "Listening" text with animated dots that cycle through: `''`, `'`, `''`, `'''`, `''''`, `'''''` every 220ms
  - **Send button** (right): circular 56px, orange, upward arrow icon. Stops recording and submits.

#### State 3: Thinking (submitting question)
- Shows the "Ask" button (disabled) + below it a spinner with "Thinking" label
- Spinner: rotating circle, cyan top border

### Question Submission API

When the user taps Send (or the recording stops normally):

```
POST /api/ask
Content-Type: multipart/form-data
Authorization: Bearer <clerk_jwt_token>

FormData fields:
  episode_id: string (UUID)
  timestamp: string (current audio playback time in seconds, e.g. "124.5")
  response_language: string (target language code, e.g. "en")
  question_audio: File (blob, MIME type "audio/webm", filename "q.webm")
```

**JWT token**: obtained from Clerk session via `session.getToken()`. Optionally pass `{ template: VITE_CLERK_JWT_TEMPLATE }` if the env var is set.

**Response handling:**
- 200 OK: `{ answer: string }` -> display the answer text
- 401: show modal "Unauthorized. Please sign in." with Sign In button
- 403: show modal "No questions left."
- Other non-200: show modal "Request failed ({status})."
- Network error: show modal "Network error while sending question."

### Audio Recording Details (for React Native)

The web app uses MediaRecorder API with these MIME type preferences (try in order):
1. `audio/webm;codecs=opus`
2. `audio/webm`
3. `audio/ogg;codecs=opus`
4. `audio/mp4`

For React Native/Expo, use `expo-av` Recording API. The backend accepts the audio blob as a file upload - send whatever format expo-av produces (m4a/caf on iOS). The filename should be `q.webm` for compatibility, but the backend likely inspects the actual content.

**Singleton microphone pattern**: The web app keeps one shared microphone stream to avoid repeated permission prompts. In React Native, microphone permissions work differently (one-time grant), so this pattern isn't needed. Just request `Audio.Recording` permissions on first use.

### Response Panel

Shown when any of: segments loaded, answer exists, loading episode data, or error.

#### Transcript Segments
- Shows 1 previous segment (dimmed, 50% opacity) + current segment (full opacity)
- Current segment determined by binary search: find the last segment where `start <= currentPlaybackTime`
- Updates in real-time as audio plays (on every timeupdate event / playback position change)
- **Clickable words**: words that have explanation data are rendered with a cyan underline. Tapping opens the Word Explanation Modal.

#### Word Explanation Modal
Full-screen overlay with a card containing:
- Header: word surface text (cyan color) + close (X) button
- Definition list with these fields (each shown only if non-empty):
  - Translation
  - Part of speech
  - Meaning
  - Pattern
  - Usage notes
  - Example (italic)
- Close on: X button tap, tap outside card

#### Answer Block
- Shown when an answer has been received from `/api/ask`
- Format: bold "Answer:" label, then the answer text paragraph below

### Error/Auth Modal
- Semi-transparent dark overlay, centered card
- Message text + action buttons:
  - Always: "Cancel" button (secondary, dismisses modal)
  - If auth-related error: "Sign in" button (primary, opens Clerk sign-in)
  - Otherwise: "OK" button (primary, dismisses modal)

### Wake Lock (iOS equivalent)
The web app uses the Screen Wake Lock API to prevent the screen from sleeping during playback and recording. In React Native, use `expo-keep-awake`:
- Activate when: audio is playing OR recording
- Deactivate when: audio paused/stopped AND not recording

### iOS Background Audio Handling
The web app has special handling for iOS standalone/PWA mode where audio state is lost when the app is backgrounded. In React Native with expo-av, this is handled natively through the `staysActiveInBackground` audio mode setting. Configure:
```js
Audio.setAudioModeAsync({
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,
})
```

---

## 5. Screen 3: About

- Back link "Back to podcasts" (navigates to Home)
- Title: "What is Krashen and how to use it"
- Body: rendered markdown content (static, from a bundled markdown file)

---

## 6. Authentication (Clerk)

- Use `@clerk/clerk-expo` for React Native
- Environment variable: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Auth was only required now for submitting questions (`POST /api/ask`) before, but let's make it required before even showing the first podcast screen.
- so User can't now get to the player screen witout passing Auth
- Header shows: Sign In button when logged out, user avatar/button when logged in
- JWT token for API calls: `session.getToken()` (or with template if configured)

---

## 7. API Base URL Configuration

The web app proxies `/api/*` to `http://localhost:8000` during development. The production backend is at `https://pregunta.app`. For the React Native app:
- Use a configurable base URL environment variable: `EXPO_PUBLIC_API_BASE_URL`
- Default/current value: `https://pregunta.app`
- All API calls prefix this base URL: `${API_BASE_URL}/api/podcasts`, etc.
- This URL may change in the future, so keeping it configurable via env var is important

**Endpoints summary:**
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/podcasts` | No | List all podcasts |
| GET | `/api/podcast/{id}/episodes` | No | List episodes for a podcast |
| GET | `/api/episode/{id}/data?target_language={lang}` | No | Transcript segments + word explanations |
| POST | `/api/ask` | Yes (Bearer JWT) | Submit audio question, get text answer |

---

## 8. User Flow

### Happy Path
1. App opens -> We ask to Authorize (Clerks's SDK)
2. Home screen loads, fetches podcasts
3. Language filter defaults to None (see all)
4. User scrolls podcast cards horizontally, taps one -> episodes load below
5. User taps an episode -> if answer language not set or invalid for this podcast's language, modal appears to pick answer language
6. User picks language (or stored one is valid) -> navigates to Player screen
7. Player loads: fetches episode metadata + transcript data, starts loading audio
8. User taps Play -> audio begins, transcript segments appear and update in real-time
9. User taps a highlighted word in transcript -> Word Explanation Modal opens with translation, meaning, etc.
10. User taps Ask button
11. Audio pauses, microphone activates, UI shows "Listening..." with pulsing orange dot
12. User asks their question aloud, taps Send (orange arrow button)
13. Recording stops, "Thinking" spinner appears
14. Audio blob + episode_id + timestamp + response_language sent to `POST /api/ask`
15. Answer text received and displayed below the transcript
16. User can tap Back to return to Home and pick another episode

### Cancel Recording Flow
1. While in "Listening" state, user taps X (cancel button)
2. Recording is discarded, microphone deactivated
3. UI returns to idle Ask button state
4. Audio does NOT auto-resume

### Error Flows
- Microphone permission denied -> modal "Microphone permission denied or unavailable."
- API returns 401 -> modal "Unauthorized. Please sign in." with Sign In button
- API returns 403 -> modal "No questions left."
- API network error -> modal "Network error while sending question."
- Episode has no audio_url -> playback card disabled, shows "Episode audio unavailable."

---

## 9. Design / Style Guide (High Level)

### Theme
- **Dark mode only** - pure black background (#000000)
- No light mode

### Colors
- **Primary/Cyan**: `#06b6d4` (buttons, links, accents, progress bar)
- **Cyan strong**: `#0ea5e9` (hover states, highlights)
- **Orange accent**: `#f97316` (send button, recording pulse, secondary actions)
- **Text primary**: `#f8fafc` at 92% opacity
- **Text secondary**: `#e2e8f0` at 65-78% opacity
- **Text muted**: `#94a3b8` at 85% opacity
- **Borders**: `#f8fafc` at 12% opacity (subtle), 28% on hover
- **Card backgrounds**: `rgba(15, 23, 42, 0.85-0.92)` (very dark blue, semi-transparent)
- **Error text**: `#f87171` / `#fca5a5`

### Typography
- Font: System default (Inter on web; San Francisco on iOS is fine)
- Base size: 15px equivalent
- Line height: 1.6
- Tabular nums for time displays

### Key Component Sizes
- Play/Pause button: 88px (72px on small screens)
- Skip buttons: min-width 88px (72px on small)
- Ask button: min-height 56px, min-width 180px
- Cancel button: 48x48px circle
- Send button: 56x56px circle
- Podcast cards: 140px wide
- Progress track: 10px height
- Progress thumb: 18px white circle with cyan border

### Rounded Corners
- Cards: 16-20px border-radius
- Buttons: 999px (full pill shape)
- Modals: 8px

### Shadows
- Buttons use colored glow shadows (e.g. cyan buttons get cyan shadow, orange buttons get orange shadow)
- Cards have deep shadows for depth

### Max Width
- Content constrained to 960px on Home, 760px on Player

---

## 10. Key Behaviors to Preserve

1. **Rewind is 15s, forward is 15s** - symmetric
2. **Audio pauses when question recording starts** - does NOT auto-resume after
3. **Answer language persists** in local storage across sessions
4. **Transcript updates in real-time** during playback, showing current + 1 previous segment
5. **Word explanations are tap-to-reveal** with cyan underline hint
6. **Speed resets to 1x** when changing episodes
7. **Recording uses 750ms timeslice** to ensure at least one chunk exists before stop
8.  **Screen stays awake** during playback and recording

## 10. Key Behaviors to change

1. **Auth is no more lazy** - we ask to sign-in straight away when openning the app