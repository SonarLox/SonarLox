# SonarLox — 3D Spatial Audio Editor

## Product Vision

A desktop application that lets you visually place audio sources in a 3D room and hear HRTF binaural spatialization in real time through headphones. The long-term goal is to retrofit spatial audio onto movie files that lack it, but the MVP proves the core concept: drag a sound, hear it move.

**License:** MIT  
**All dependencies are MIT-licensed.** TypeScript (Apache 2.0) is build-time only and does not ship in the binary.

---

## MVP Scope (v1.0)

### What it does

- Load a single audio file (MP3 or WAV) or generate a built-in test tone (sine wave, pink noise)
- Visualize a 3D room with a draggable sound source and a fixed listener at center
- Spatialize audio in real time using HRTF binaural panning via Web Audio API
- Show visual feedback: waveform display on the source, distance/volume indicator rings
- Export the spatialized result as a binaural stereo WAV file

### What it does NOT do (deferred to v2+)

- Multiple simultaneous sources / mixer UI
- Timeline with keyframed movement paths
- Room size/shape/material controls affecting reverb
- Live microphone input
- Video file sync
- AI-based stem separation
- Ambisonics or Dolby Atmos export

### User Flow

1. Launch app → see a 3D room with a listener head icon at center
2. Click "Load Audio" (file picker for MP3/WAV) or select a test tone (sine, pink noise)
3. A glowing sphere appears representing the sound source; audio begins playing (looped)
4. Drag the sphere anywhere in 3D space (X/Y/Z) → audio spatializes in real time
5. Visual rings around the source show distance from listener and relative volume
6. Waveform or level meter rendered on/near the source for visual audio feedback
7. Click "Export" → renders the current source position as a binaural stereo WAV to disk
8. Transport controls: play, pause, stop, loop toggle

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| App shell | Electron | Best AI-agent training data coverage, single-language stack (TS), huge npm ecosystem |
| Frontend framework | React 18+ with TypeScript | Agent-friendly, massive ecosystem |
| 3D rendering | React Three Fiber (Three.js) | Declarative 3D in React, draggable objects via @react-three/drei |
| Audio engine | Web Audio API (PannerNode + HRTF) | Native browser spatial audio, zero dependencies |
| Audio processing | Tone.js (optional, for test tone generation) | Clean oscillator/noise API |
| WAV export | audiobuffer-to-wav or wav-encoder | Render AudioBuffer to WAV binary |
| State management | Zustand | Lightweight, minimal boilerplate, works great with R3F |
| Build tooling | Vite + electron-vite | Fast HMR, modern bundling for Electron |
| Package manager | npm | Universal, agent-compatible |
| Language | TypeScript throughout | Type safety, better agent output quality |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Electron Main Process           │
│  - File dialogs (open audio, save WAV export)    │
│  - IPC bridge to renderer                        │
│  - App lifecycle                                 │
└──────────────────────┬──────────────────────────┘
                       │ IPC
┌──────────────────────▼──────────────────────────┐
│                Electron Renderer Process          │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │              React App                       │ │
│  │                                              │ │
│  │  ┌──────────────┐  ┌─────────────────────┐  │ │
│  │  │  3D Viewport  │  │   Control Panel     │  │ │
│  │  │  (R3F Canvas) │  │   - Load audio      │  │ │
│  │  │  - Room mesh  │  │   - Test tone select │  │ │
│  │  │  - Source     │  │   - Transport ctrls  │  │ │
│  │  │    (draggable)│  │   - Position readout │  │ │
│  │  │  - Listener   │  │   - Volume           │  │ │
│  │  │  - Distance   │  │   - Export button    │  │ │
│  │  │    rings      │  │                      │  │ │
│  │  └──────┬───────┘  └──────────┬──────────┘  │ │
│  │         │                      │             │ │
│  │  ┌──────▼──────────────────────▼──────────┐  │ │
│  │  │          Audio Engine (singleton)       │  │ │
│  │  │  - AudioContext                         │  │ │
│  │  │  - AudioListener (fixed position)       │  │ │
│  │  │  - PannerNode (HRTF, tracks source pos) │  │ │
│  │  │  - GainNode (volume control)            │  │ │
│  │  │  - AnalyserNode (waveform/FFT data)     │  │ │
│  │  │  - Source: AudioBufferSourceNode or      │  │ │
│  │  │    OscillatorNode (test tones)           │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### Spatial Audio
- Use `PannerNode` with `panningModel: 'HRTF'` and `distanceModel: 'inverse'`
- Listener at origin (0, 0, 0), facing -Z (default Web Audio orientation)
- Source position updated on every drag frame via `panner.positionX/Y/Z.setValueAtTime()`
- Distance attenuation: `refDistance: 1`, `maxDistance: 50`, `rolloffFactor: 1`

### 3D Scene
- Room: wireframe box geometry, 20x10x20 units (W x H x D)
- Source: sphere mesh with emissive glow, uses @react-three/drei pointer events or drag controls
- Listener: static head icon or crosshair at origin
- Camera: orbital controls, default isometric-ish angle
- Grid helper on floor plane for spatial reference
- Distance rings: torus geometries or shader rings emanating from source

### Visual Audio Feedback
- `AnalyserNode` connected to audio graph
- Waveform or frequency bar display rendered as a billboard near the source
- Possible pulsing/scaling of the source sphere based on amplitude

### Export
- OfflineAudioContext renders the full audio buffer with spatial processing baked in
- Output: 44.1kHz 16-bit stereo WAV
- Electron main process handles file save dialog

---

## Project Structure

```
sonarlox/
├── CLAUDE.md                    # Claude Code project instructions
├── SPEC.md                      # This file
├── LICENSE                      # MIT License
├── package.json
├── tsconfig.json
├── electron-vite.config.ts
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App entry, window creation
│   │   └── ipc.ts               # IPC handlers (file dialogs, export)
│   ├── preload/
│   │   └── index.ts             # Context bridge
│   └── renderer/                # React app
│       ├── index.html
│       ├── main.tsx             # React entry
│       ├── App.tsx              # Root layout (viewport + panel)
│       ├── components/
│       │   ├── Viewport.tsx     # R3F Canvas wrapper
│       │   ├── Room.tsx         # 3D room mesh
│       │   ├── SoundSource.tsx  # Draggable source with visuals
│       │   ├── Listener.tsx     # Listener icon at origin
│       │   ├── DistanceRings.tsx # Visual distance indicators
│       │   ├── AudioVisualizer.tsx # Waveform/FFT display
│       │   └── ControlPanel.tsx # Sidebar: load, tone, transport, export
│       ├── audio/
│       │   ├── AudioEngine.ts   # Singleton: AudioContext, nodes, graph
│       │   ├── TestTones.ts     # Sine wave, pink noise generators
│       │   └── Exporter.ts      # OfflineAudioContext → WAV
│       ├── stores/
│       │   └── useAppStore.ts   # Zustand store: source position, playback state
│       └── types/
│           └── index.ts         # Shared TypeScript types
└── resources/                   # App icons, etc.
```

---

## Implementation Phases

### Phase 1: Scaffold (Est. 1 session) — LOCAL: qwen3-coder
- Initialize Electron + electron-vite + React + TypeScript project
- Confirm hot reload works
- Empty R3F canvas renders in Electron window

### Phase 2: 3D Scene (Est. 1-2 sessions) — LOCAL: qwen3-coder
- Room wireframe box
- Listener marker at origin
- Draggable sphere (SoundSource) — confirm XYZ drag works
- Orbital camera controls
- Floor grid
- Zustand store for source position

### Phase 3: Audio Engine (Est. 1-2 sessions) — CLOUD for design, LOCAL for implementation
- CLOUD: Design audio graph topology (AudioContext → nodes → output)
- CLOUD: PannerNode HRTF configuration and spatial math
- LOCAL: Implement AudioEngine.ts singleton, wire nodes
- LOCAL: Load MP3/WAV via file picker → decode → play looped
- LOCAL: Test tone generators (sine, pink noise)
- LOCAL: Wire source position from store → PannerNode position
- Confirm: drag sphere, hear HRTF spatialization through headphones

### Phase 4: Visual Feedback (Est. 1 session) — LOCAL: qwen3-coder
- Distance rings (torus or shader) between source and listener
- AnalyserNode → waveform data → visual display on source
- Source sphere scales/pulses with amplitude

### Phase 5: Export (Est. 1 session) — CLOUD for strategy, LOCAL for implementation
- CLOUD: OfflineAudioContext rendering strategy with spatial processing
- LOCAL: Implement Exporter.ts — render buffer, convert to WAV
- LOCAL: Electron save dialog → write to disk

### Phase 6: Polish (Est. 1 session) — LOCAL: qwen3-coder or glm-4.7-flash
- Transport controls (play/pause/stop/loop)
- Volume slider
- Position readout (X, Y, Z coordinates)
- Source position clamped to room bounds
- Error handling (invalid files, audio context resume)
- App icon and window title

---

## Development Environment

### Hardware
- Dev machine: local workstation with NVIDIA RTX 3090 (24GB VRAM)
- Audio output: headphones required for HRTF testing

### AI Coding Setup

**Orchestrator:** Claude Code (cloud, Anthropic API) for architecture, planning, complex debugging

**Local model:** Ollama on RTX 3090 with Qwen3-Coder 30B or Qwen 2.5 Coder 32B for high-volume code generation

**Switch between local and cloud:**
```bash
# Local (free, on your 3090)
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
claude --model qwen3-coder

# Cloud (paid, smarter — for hard problems)
unset ANTHROPIC_BASE_URL
unset ANTHROPIC_AUTH_TOKEN
claude
```

### Recommended MCP Servers

```bash
# Live library docs — prevents hallucinated APIs for Three.js, R3F, Web Audio, Electron
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest

# GitHub repo management once project is on GitHub
claude mcp add github -- npx -y @modelcontextprotocol/server-github

# Enhanced local file operations
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem ~/sonarlox
```

### Recommended Plugins

| Plugin | Purpose |
|---|---|
| Claude-Mem | Persistent memory across sessions — remembers architectural decisions |
| Superpowers | Structured lifecycle: brainstorm → TDD → debug → review |
| TypeScript LSP | Real-time type checking in agent workflow |
| Context7 Plugin | Auto-triggers doc lookup for library references |

### Workflow Best Practices
- Start each feature in Plan Mode (Shift+Tab twice), review plan, then switch to Act Mode
- Run `/compact` proactively at ~50-70% context usage
- Use subagents for research tasks to keep main context clean
- Fresh session per implementation phase
- Test after every phase before moving on

---

## Success Criteria (MVP)

1. App launches as a native Electron window showing a 3D room
2. User can load an MP3/WAV or select a test tone
3. Audio plays through headphones with binaural HRTF spatialization
4. Dragging the source sphere in 3D space produces convincing spatial audio movement
5. Visual rings show distance relationship between source and listener
6. Waveform or level visualization reacts to audio in real time
7. Export produces a playable binaural stereo WAV file
8. All controls (transport, volume, export) function without errors

---

## Future Roadmap (v2+)

- **Multi-source**: Add/remove multiple audio sources, per-source controls, mixer panel
- **Timeline**: Keyframeable position curves over time, scrub with playback
- **Room acoustics**: Configurable room dimensions and materials, convolution reverb
- **Video sync**: Import video, attach spatialized audio, frame-accurate sync
- **Stem separation**: AI-based (Demucs) to split stereo tracks into dialogue/music/FX
- **Ambisonics export**: B-format WAV for YouTube 360/VR compatibility
- **Head tracking**: Webcam or gyroscope-based listener orientation
- **Multiple listener positions**: Preview from different seats in a virtual theater