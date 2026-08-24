# UI/UX Design Brief

## 1. Visual Design Philosophy
VOICEGUARD is designed as a **SOC (Security Operations Center) dashboard**. It focuses on **high information density**, **dark-mode first aesthetics**, and **clear visual hierarchy** to help security analysts make rapid decisions.

- **Background**: Deep Zinc (`#09090b` / Tailwind `zinc-950`).
- **Cards**: Dark Slate (`#18181b` / Tailwind `zinc-900`) with subtle gray borders (`#27272a`).
- **Typography**: Inter (UI text) + JetBrains Mono (metrics, timecode logs, variables).
- **Icons**: Lucide React (minimalistic, thin stroke).

---

## 2. Color Palettes by Severity
Risk alerts leverage a standardized semantic color code:

| Severity | Range | Accent Color | Hex Code |
|---|---|---|---|
| **Low Risk** | 0% – 30% | Green (Emerald) | `#10b981` |
| **Medium Risk** | 31% – 60% | Amber / Yellow | `#f59e0b` |
| **High Risk** | 61% – 80% | Red / Crimson | `#ef4444` |
| **Critical Risk** | 81% – 100% | Violet / Magenta | `#a855f7` |

---

## 3. Key Layout Components

### 3.1 Live Dashboard Panel
- **Header**: Call Status (Live, Connected, Reconnecting) with flashing red indicator. Action controls (Start, Mute, Pause, Stop) in a button group.
- **Left Column**:
  - **Risk Assessment Card**: Large radial progress gauge displaying the smoothed risk score.
  - **Status Indicator**: Alert banner reflecting the current Severity level (e.g., "CRITICAL THREAT DETECTED").
  - **Waveform Canvas**: Canvas-based real-time line visualizer plotting the raw PCM stream amplitude.
- **Right Column**:
  - **Language Profile Card**: Simple bar showing language detection confidence.
  - **Speaker Authentication Card**: Ring gauge representing reference similarity score.
  - **Evidence Breakdown**: Cards mapping features to abnormality levels.
  - **Context Warning Panel**: Highlighted section listing active context keywords (e.g., "Monetary Transfer Requested").

---

## 4. Charts & Diagrams
- **Recharts Area Chart**: Dynamic 30-second rolling timeline of the risk score.
- **Audio Waveform**: Fast Canvas renderer plotting microphone amplitudes.
- **Spectral Feature Bar Charts**: Dynamic distribution comparison comparing current audio spectral centroid, roll-off, and ZCR against typical values.
