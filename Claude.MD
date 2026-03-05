# SonarLox

Open-source 3D spatial audio editor (MIT License). Electron desktop app -- load audio, place it in a 3D room, hear HRTF binaural spatialization in real time, export as stereo WAV.

## Stack
- Electron + electron-vite
- React 18 + TypeScript (strict mode)
- React Three Fiber (@react-three/fiber, @react-three/drei) for 3D
- Web Audio API for spatial audio (PannerNode HRTF)
- Zustand for state management
- ES modules throughout, no CommonJS

## Code Style
- Functional components only, no class components
- Named exports for components, default export for pages/layouts
- Destructure imports (`import { useState } from 'react'`)
- Avoid `any` -- use proper types from src/renderer/types/
- Audio engine is a singleton class in src/renderer/audio/WebAudioEngine.ts (implements IAudioEngine interface)

## Key Architecture
- Main process (src/main/) handles file dialogs and IPC only
- Renderer process (src/renderer/) has all UI and audio logic
- Zustand stores (src/renderer/stores/):
  - `useAppStore` -- Decomposed into logical slices:
    - `SourceSlice`: Source management (add/remove/properties)
    - `AnimationSlice`: Keyframe and timeline automation
    - `HistorySlice`: Undo/Redo with selective cloning
    - `ProjectSlice`: Metadata, room size, global audio settings
    - `UiSlice`: Playback status, camera commands, export progress
    - `VideoSlice`: Video file, offset, frame rate, 3D screen state
  - `useTransportStore` -- Shared playback timing, playhead loop, refreshDuration
- Audio Engine:
  - `WebAudioEngine.ts` (Singleton): Coordinates channels and master output
  - `SourceChannel.ts`: Per-source audio chain (gain, panner, analyser, buffers)
- Audio graph (live): per-source gain -> [plugin effects] -> panner(HRTF) -> analyser -> masterGain -> [master effects] -> masterAnalyser -> destination
- Plugin system:
  - Audio effects: inserted between gainNode and pannerNode (per-source) or between masterGain and masterAnalyser (master)
  - Visualizers: Rendered into R3F scene using custom `render` methods
  - Exporters: Custom formats added to ExportDialog
  - Directory: ~/.sonarlox/plugins/ (or %APPDATA%/sonarlox/plugins/)
- Control Panel: Collapsible `Section` component wraps all sidebar sections. Core sections (Session, Sources, Transport, Output) open by default; secondary sections (Environment, Video Sync, Plugins, Camera) collapsed by default. Section accepts `label`, `accessory`, and `defaultCollapsed` props. Future plugin panels should use this component.
- Video: Docked video panel with transport sync. 3D video screen in scene with fixed orientation (no billboard). Draggable, lockable, scalable.
- Undo/Redo: Ctrl+Z/Ctrl+Y with selective state snapshots
- Drag & Drop: Drop audio/MIDI files directly into the 3D room
- Timeline: Waveform scrubbing, automation lanes, Catmull-Rom spline interpolation for keyframed animations
- Toasts & Dialogs: Console-styled status strips and native OS confirmation dialogs

## Performance Pattern: Zustand Transient Updates
- Components that read position in useFrame use `useAppStore.getState()` (no subscription, no re-render)
- SoundSource updates mesh position directly via ref during drag, throttles store commits at ~15hz
- AudioBridge, AudioVisualizer, DistanceRings all use getState() in useFrame
- Never subscribe to high-frequency state (sourcePosition) in components that only need it per-frame

## Commands
- `npm run dev` -- start dev server with hot reload
- `npm run build` -- production build
- `npm run lint` -- ESLint check
- `npm run typecheck` -- tsc --noEmit

## Verification
- After changes, always run typecheck and confirm the app renders
- Test audio: load any MP3, drag source, confirm spatial panning through headphones
- Test export: open Export dialog, select binaural, export mix, confirm stereo spatialization
- Test export 5.1: export 5.1 mix, open in Audacity, confirm 6 channels
- Test export stems: export individual stems to directory, confirm files saved
- Test export solo: solo one source, export mix, confirm only soloed source in output
- Test pause/resume: pause mid-track, resume from same position
- Test loop toggle: turn off loop, confirm audio stops at end
- Test listener height: slide listener Y, confirm spatial audio changes
- Test solo: solo one source, only that source audible; mute+solo = silent
- Test timeline: playhead moves during playback, click to scrub, waveforms render
- Test master volume: slider affects overall output
- Test device selector: dropdown lists available audio output devices
- Test keyboard shortcuts: Space toggles play, 1-8 selects sources, Delete removes
- Test plugins: Enable "Simple Reverb" on a source, confirm effect. Enable "Spectrum Visualizer" and confirm bars.
- Test plugin persistence: Save project with active plugin, reload, confirm settings restored
- Test collapsible sections: Click section headers to collapse/expand, chevron rotates, content animates in
- Test video: Load MP4, press play, video and audio in sync. Frame-step with arrows. TC offset works.
- Test video screen: 3D screen stays at fixed orientation, can be dragged and locked

## Model Routing

Local models via Ollama (RTX 3090, 24GB VRAM) plus cloud Claude:

| Model | Context | Speed | Use for |
|---|---|---|---|
| `qwen3-coder` (local) | 32k | ~70 tok/s | Scaffolding, boilerplate, components, repetitive edits |
| `qwen2.5-coder:32b` (local) | 16-32k | ~35 tok/s | Multi-file refactors, TypeScript wiring, straightforward debugging |
| `glm-4.7-flash` (local) | 32k | fastest | Quick questions, small edits, renaming, formatting |
| Cloud Claude (Anthropic API) | 200k | varies | Architecture decisions, complex debugging, reviewing local model output |

**Local (~80%):** Boilerplate, component shells, store wiring, IPC, CSS, tests, simple bug fixes.
**Cloud (~20%):** Audio graph design, OfflineAudioContext strategy, architectural questions, auditing local model output.

### Switching models
```bash
# Local
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
claude --model qwen3-coder

# Cloud
unset ANTHROPIC_BASE_URL
unset ANTHROPIC_AUTH_TOKEN
unset ANTHROPIC_API_KEY
claude
```

## Reference
- Full spec: see Spec.md in project root
- Development plan: see plan.md in project root
- Web Audio API spatial: use context7 for PannerNode and HRTF docs
- React Three Fiber: use context7 for current docs
- Electron + electron-vite: use context7 for current docs
