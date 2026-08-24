# Application Flow and States

## 1. Application Routes & Navigation
The application features a secure layout with sidebar navigation. 

```
/ (Landing Page)
  ├── /login (Auth Page)
  ├── /signup (Auth Page)
  └── /dashboard (Protected Layout)
        ├── /live (Live Voice Analysis)
        ├── /upload (Audio File Analysis)
        ├── /simulate (Simulated Call Streamer)
        ├── /telephony (API & Adapter Configs)
        ├── /alerts (SOC Threat Dashboard)
        ├── /history (Session Log)
        ├── /analytics (Model Performance & Benchmarks)
        ├── /settings (Global Configurations)
        ├── /privacy (Disclosures & Policies)
        ├── /terms (Disclosures & Policies)
        └── /security (Disclosures & Policies)
```

---

## 2. Interactive Flows

### 2.1 Live Voice Analysis Flow
1. **Initiate**: User clicks "Start Live Analysis".
2. **Permission Check**: Browser prompts for microphone access.
   - *If Denied*: Transitions to "No Microphone State".
3. **Establish Connection**: Opens WebSocket to `/ws/live-analysis?token=<JWT>`.
   - *If Failed*: Transitions to "WebSocket Reconnecting / Offline State".
4. **Capture**: Start capturing raw float32 PCM frames.
5. **Streaming**: Transmit binary packets (256ms) over WebSocket.
6. **Receiving**: Backend returns JSON payload containing:
   - `risk_score` (0-100)
   - `ai_probability` (0.0-1.0)
   - `language` & `language_confidence`
   - `speaker_similarity` (if reference file loaded)
   - `evidence` (list of reasons)
   - `context_detected` (high-risk phrase match)
7. **Action Controls**:
   - **Mute**: Halts audio frame transmission, WebSocket remains active.
   - **Pause**: Halts streaming and pauses frontend timer.
   - **Stop**: Closes WebSocket, commits metadata to the database, transitions to "Success / Report Ready" state.

### 2.2 Simulated Live Call Flow
1. **File Selection**: User uploads a `.wav` / `.mp3` audio file.
2. **Establish Connection**: Opens WebSocket connection to `/ws/live-analysis?simulated=true`.
3. **Simulated Chunks**: Frontend reads file into buffer, slices it into chunks equivalent to 256ms of audio.
4. **1x Streaming**: Frontend transmits chunks sequentially using an interval timer (every 256ms) to replicate true calling speed.
5. **Dashboard Updates**: Display features update progressively in real-time, matching the Live Analysis pipeline.

---

## 3. UI State Transitions
The frontend handles critical states:
- **Loading State**: Displayed during API requests or model loading (skeleton loaders).
- **Empty State**: Shown when no alerts or history logs are present.
- **Error State**: Displays API failure notices with retry actions.
- **Offline State**: Triggers when `navigator.onLine` is false or WebSocket fails.
- **No Microphone State**: Informs the user of missing mic permission with directions to re-enable.
- **Processing State**: Appears during file upload analysis prior to completion.
- **Model Unavailable State**: Displays a badge if backend classification models fail to load, falling back to mock outputs if enabled.
- **WebSocket Reconnecting State**: Dynamic indicator attempting reconnection 3 times before failing.
- **Session Expired State**: Forces logout redirect with JWT expiration notice.
