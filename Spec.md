# SonarLox Spec

## Product Vision

A desktop application that lets you visually place multiple audio sources in a 3D room and hear HRTF binaural spatialization in real time through headphones. Load stems from a song, position each in 3D space, and export the result as a single binaural stereo WAV -- or load a MIDI file and hear each instrument track spatialized automatically. Sync to video for film/game post-production workflows.

**License:** MIT

---

## Core Workflows

### Workflow 1: Manual Stems

1. Add up to 8 audio sources (WAV/MP3), each appears as a color-coded sphere
2. All sources share a global transport -- play/pause/stop keeps everything in sync
3. Drag each sphere to position instruments in 3D space
4. Per-source controls: volume slider, mute, solo
5. Timeline shows waveform per track with shared playhead and automation lanes
6. Export as binaural stereo WAV, 5.1 surround WAV, or per-source stems

### Workflow 2: MIDI Import

1. Load a .mid file -- SonarLox creates one source per track/channel (up to 8)
2. Basic oscillator synth generates audio per channel (mapped to GM program numbers)
3. Optionally load a SoundFont (.sf2) for realistic instrument sounds
4. Same 3D positioning, transport, and export as Workflow 1

### Workflow 3: Video Sync

1. Load a video file (MP4/WebM/MOV/MKV) alongside audio sources
2. Video plays in lockstep with audio transport (play/pause/seek/frame-step)
3. SMPTE timecode display with configurable frame rate and TC offset
4. 3D video screen in scene for spatial reference
5. Export produces audio only -- video sync is for authoring

---

## Audio Engine

### Architecture

Each source gets its own processing chain, all feeding into a shared output:

```
Source: AudioBuffer -> GainNode -> [Plugin Effects] -> PannerNode(HRTF) -> AnalyserNode
                                                                              |
All sources ----------------------------------------------------------------> MasterGain -> [Master Effects] -> MasterAnalyser -> destination
```

All sources share a single `AudioContext`. Each source has its own `SourceChannel` managing gain, panner, analyser, and buffer nodes.

### Source Data Model

```typescript
interface AudioSource {
  id: string
  label: string
  color: string
  position: [number, number, number]
  volume: number
  isMuted: boolean
  isSoloed: boolean
  sourceType: 'file' | 'tone' | 'midi-track'
  audioFileName: string | null
  sineFrequency: number
}
```

### Source Limit

Maximum 8 simultaneous sources. Balances HRTF PannerNode performance, visual clarity in the 3D room, and practical stem separation outputs.

### Solo/Mute Logic

Standard DAW behavior:
- **Mute**: GainNode -> 0. Independent of solo.
- **Solo**: when any source is soloed, only soloed sources play. Muted sources stay muted even if soloed.
- **Export matches playback**: solo/mute filtering applies to offline renders.

---

## Transport

- Single play/pause/stop controlling all sources simultaneously
- Sample-accurate sync: all sources start at the same `AudioContext.currentTime`
- Playhead position tracked in seconds, updated via rAF loop
- Loop toggle: all sources loop back to 0 when the longest source ends
- Video sync: `useVideoSync` hook locks HTML5 video element to transport state

---

## Timeline

- Horizontal timeline spanning duration of longest source
- Per-source waveform rows with color swatch, label, mute/solo buttons
- Click/drag to scrub playhead
- Automation lanes per source with keyframe editing
- Catmull-Rom spline interpolation for smooth animated source positions
- Recording mode: drag source during playback to auto-create keyframes (R key)

---

## Export

### Export Dialog

Opens via "Export..." button with:
- **Type**: Full Mix / Individual Stems
- **Mode**: Binaural (Stereo) / 5.1 Surround / Both
- Progress bar with cancel support

### Binaural Stereo

OfflineAudioContext with HRTF PannerNodes per source. Position automation baked in via setValueAtTime at 20ms intervals. Outputs 44.1kHz 16-bit stereo WAV.

### 5.1 Surround

VBAP panning to ITU-R BS.775 speaker layout (FL, FR, C, LFE, SL, SR). Each source's angle computed per frame, gain distributed across nearest speaker pair. LFE receives low-passed (<120Hz) content. Outputs 6-channel WAV.

### Per-Source Export

Directory picker, then batch render each source as individual spatialized WAV. Sanitized filenames with path traversal protection.

---

## Visual Feedback

- **Distance rings**: Color-coded torus geometries emanating from each source
- **FFT visualizer**: Per-source frequency bars as billboard near source sphere
- **Amplitude**: Source sphere scales/pulses with audio level
- **Listener wedge**: Facing direction indicator extending in -Z direction
- **Front/back cue**: Source color shifts when behind the listener

---

## Video Synchronization

- **Docked panel**: Broadcast-monitor aesthetic between viewport and timeline
- **Transport sync**: play/pause/seek/frame-step via `useVideoSync` hook
- **SMPTE timecode**: `HH:MM:SS:FF` based on configured frame rate (23.976/24/25/29.97/30/60)
- **TC offset**: Slider to align video start relative to audio timeline
- **3D screen**: Fixed-orientation video mesh in scene (draggable, lockable, scalable)
- **Audio extraction**: Extract audio track from video file as new source
- **Visual details**: CRT scanlines, broadcast crop marks, vignette overlay
- **Export**: Audio only -- video reference stored in project file (not embedded)
- **Custom protocol**: `sonarlox-video://` via `buildVideoUrl` helper

---

## Control Panel

300px collapsible sidebar with `Section` component pattern:

| Section | Default State | Contents |
|---|---|---|
| Session | Open | Project name, save/open/new, dirty indicator |
| Sources | Open | Source list (M/S/x buttons), inline properties when selected |
| Transport | Open | Play/pause/stop, loop, record, quantize |
| Output | Open | Device selector, master volume, SoundFont |
| Environment | Collapsed | Listener height, room size (W/D) |
| Video Sync | Collapsed (open if video loaded) | Load/unload, TC offset, FPS, visibility, 3D screen controls |
| Plugins | Collapsed | Plugin list, ON/OFF toggle, target routing, editor |
| Camera | Collapsed | Home + 4 presets (Shift+click to save) |

### Section Component

Reusable `Section` component (`src/renderer/components/Section.tsx`):
- Chevron toggle with rotate animation
- `label` prop: section header text
- `accessory` prop: right-aligned badge/button in header
- `defaultCollapsed` prop: initial state
- `sectionReveal` CSS animation on expand

Future plugin panels and feature panels should use this component.

---

## Plugin System

### Plugin Types

| Type | Description |
|---|---|
| `audio-effect` | Per-source or master insert (reverb, delay, EQ) |
| `visualizer` | Custom 3D visualization in R3F scene |
| `exporter` | Custom export format |
| `source-generator` | Custom audio source |

### Plugin Manifest

Each plugin is a directory in `~/.sonarlox/plugins/` with a `plugin.json`:

```json
{
  "id": "com.example.reverb",
  "name": "Convolution Reverb",
  "version": "1.0.0",
  "type": "audio-effect",
  "main": "index.js",
  "parameters": [
    { "id": "wet", "type": "float", "min": 0, "max": 1, "default": 0.3, "label": "Wet Mix" }
  ]
}
```

### Audio Effect Chain

```
Source -> GainNode -> [Effect1] -> [Effect2] -> PannerNode(HRTF) -> masterGain -> destination
```

- Effects insert between GainNode and PannerNode (pre-spatial)
- Master effects insert between masterGain and masterAnalyser (post-spatial)
- Bypass toggle per effect
- Plugin state serialized in .sonarlox project files

### Included Examples

Simple Reverb, Spectrum Visualizer, Bitcrusher

---

## Project Files

### Format

`.sonarlox` ZIP archive containing:
- `state.json` -- sources, positions, volumes, settings, plugin state
- `timeline.json` -- keyframes per source (v1.1.0 format with animations)
- `manifest.json` -- metadata, video reference
- Embedded WAV buffers per source

### Video Reference

Video files are referenced by path, not embedded:
```json
{
  "hasVideoSync": true,
  "video": { "fileName": "scene_04.mp4", "offset": 0.0, "frameRate": 24 }
}
```
Missing video on reopen triggers "locate file" dialog.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| Space | Toggle play/pause |
| 1-8 | Select source by index |
| Delete | Remove selected source |
| R | Toggle recording mode |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+S | Save project |
| Ctrl+O | Open project |
| Ctrl+Shift+S | Save as |
| Arrow keys | Frame-step video (when paused) |

---

## Spatial Choreography Engine

Procedural motion library that generates keyframe arrays from named psychoacoustic behaviours, replacing manual keyframe placement for common spatial patterns.

### Architecture

```
ChoreographyBehaviour (union of 12+ primitives)
  + ChoreographyContext { sourceId, startPosition, startTime, bpm, roomBounds }
  -> generateKeyframes() -> GeneratedKeyframes
  -> useChoreography hook -> AnimationSlice.setKeyframe() calls
```

### Emotional Registers

Each register has at least 2 motion primitives:

| Register | Perceptual Effect |
|---|---|
| **Tension** | Spatial unease, instability, threat |
| **Intimacy** | Closeness, warmth, presence |
| **Release** | Resolution, arrival, settling |
| **Disorientation** | Confusion, loss of grounding |
| **Conversation** | Two sources responding to each other spatially (dual sourceId) |

### Design Principles

- All motion grounded in psychoacoustic research (HRTF sensitivity, ILD/ITD cues, distance perception)
- Musical timing: durations expressed in beats, synced to BPM from transport
- Each primitive has a stated perceptual effect (what the listener *feels*, not what the source does)
- Parameters expose only what the user should control; all creative decisions baked into the algorithm
- Generated keyframes are directly compatible with existing `setKeyframe()` API

### Key Files

- `src/renderer/audio/Choreography.ts` -- types + `generateKeyframes()` + all primitive implementations
- `src/renderer/hooks/useChoreography.ts` -- React hook bridging to Zustand stores
- `docs/CHOREOGRAPHY.md` -- psychoacoustic design document with pairing guide
- `CHOREOGRAPHY_SPEC.md` -- TypeScript API spec (types only)

### Build Strategy

Two-phase prompt strategy to minimize cloud cost:
1. **Phase 1 (Cloud Opus):** Design doc, TypeScript API spec, and implementation briefs (~$0.30)
2. **Phase 2 (Local Qwen3-Coder):** One primitive per session from brief (free local inference)
3. **Phase 3 (Local):** `useChoreography` hook wiring

---

## Deferred to v2+

- **AI stem separation** (Demucs/HTDemucs)
- **Room acoustics** (materials, convolution reverb -- plugin candidate)
- **Multi-output routing** (different sources to different physical speakers)
- **Speaker calibration**
- **Dolby Atmos / 7.1.4 export** (ADM BWF -- exporter plugin candidate)
- **Head tracking** (webcam/gyroscope listener orientation)
- **Native audio backend** (PortAudio)
- **Plugin registry/store** (curated online registry)
- **Multi-camera system** (fixed audio camera + cameras for screen controls, VR views)
- **Video export** (mux spatial audio into video container via ffmpeg)
- **Spatial media player** (MKV demux, per-channel 3D mapping, speaker dome visualizer)
- **Collaborative editing** (operational transform on state/timeline)
- **Web player export** (static HTML+JS bundle for browser playback)
