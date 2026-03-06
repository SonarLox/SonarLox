# SonarLox Development Plan

## Completed

### Phase 1-6: Core Foundation (v0.x)
- Electron + electron-vite scaffold, React Three Fiber 3D scene
- Single-source spatial audio with HRTF PannerNode
- Visual feedback (distance rings, FFT, front/back cue)
- Basic WAV export, initial UI

### Phase 7-9: Multi-Source Audio
- IAudioEngine interface, WebAudioEngine singleton + SourceChannel
- Multi-source Zustand store, source list with mute/solo
- Transport store with sample-accurate sync, timeline with waveform scrubbing
- Audio output device selection via setSinkId

### Phase 10-11: MIDI & SoundFont
- MIDI import via @tonejs/midi, oscillator synth with GM program mapping
- SoundFont (SF2) via js-synthesizer/FluidSynth WASM, re-render on load/unload

### Phase 12: Export System
- ExportDialog with binaural stereo, 5.1 surround (VBAP), and stem exports
- Solo/mute respected in offline render, progress tracking, cancel support

### Project Save/Load
- .sonarlox ZIP format (state.json + timeline.json + embedded WAV)
- Ctrl+S/O/Shift+S shortcuts, dirty tracking, 3-button save dialogs

### Phase 13: Visual Enhancements
- Listener directional wedge, front/back color shift on source spheres
- Distance rings with ground projection, per-source FFT visualizer

### Phase 14: UX Polish (v1.0)
- Console-styled toast notification system (LED + type badge + drain bar)
- Tooltips, window constraints (800x500), native confirmation dialogs
- CSS theme with Oxanium/Outfit/Share Tech Mono fonts
- v1.0.0 tagged and released

### Phase 15: Animation System
- Keyframed position automation with Catmull-Rom spline interpolation
- Automation lanes in timeline, keyframe dragging, motion path preview
- Recording mode (R key) with configurable quantize
- Export bakes position automation at 20ms intervals
- Project serialization v1.1.0

### Phase 16: Plugin System
- Plugin scanner, loader, editor panel with ON/OFF + target routing
- Audio effects (per-source or master chain), visualizers, exporters
- Error boundary, effect chain rebuild, project persistence
- Included: Simple Reverb, Spectrum Visualizer, Bitcrusher

### Phase 17: Undo/Redo & Refinements
- Undo/redo with selective state snapshots (Ctrl+Z/Y)
- Drag & drop audio/MIDI files into 3D room
- Dynamic room size (10m-50m), modular Zustand store slices
- Refined UI sections (Session, Output, Environment)

### Phase 18: Video Synchronization (v1.1)
- Docked video panel with broadcast-monitor aesthetic (scanlines, crop marks, vignette)
- Transport sync via useVideoSync hook (play/pause/seek/frame-step)
- SMPTE timecode display (HH:MM:SS:FF), configurable frame rate
- TC offset slider, video visibility toggle, opacity control
- 3D video screen in scene (fixed orientation, draggable, lockable, scalable)
- Extract audio track from video as new source
- buildVideoUrl helper, refreshDuration transport action

### Phase 19: Control Panel Redesign
- Reusable collapsible Section component (chevron toggle, label, accessory, defaultCollapsed)
- Workflow-priority grouping: core sections open, secondary collapsed
- Source properties merged inline under Sources section
- Tighter spacing (300px sidebar, 2px section gap, sectionReveal animation)

### Phase 20: Spatial Choreography Engine
- Procedural motion primitives that generate keyframe arrays from psychoacoustic principles
- 13 named behaviours covering tension, intimacy, release, disorientation, conversation
- `ChoreographyBehaviour` union type with per-primitive parameter interfaces
- Single entry point: `generateKeyframes(behaviour, context) -> GeneratedKeyframes`
- `useChoreography` hook wiring to AnimationSlice and TransportStore
- `ChoreographySection.tsx` with register tabs, primitive cards, BPM, duration, partner selector
- Files: `Choreography.ts`, `useChoreography.ts`, `ChoreographySection.tsx`
- Design doc: `docs/CHOREOGRAPHY.md`

### Phase 21: Advanced Plugin UI
- Plugin panels use Section component for consistent collapsible UI
- Plugin parameter presets (save/recall)
- Plugin chain reordering via drag & drop
- Custom plugin visualizer panels docked in sidebar

### Demucs Integration
- Stem separation via Python subprocess (htdemucs model)
- DemucsSlice in Zustand store (probe, status, progress, error)
- IPC: probe/separate/cancel/install with progress events
- Setup modal, "Spatialise Stems" button, OOM retry with smaller model
- Batch undo for stem additions, before-quit cleanup of child processes

### SpeakerLayout + SpatialRenderer Refactor
- `SpeakerLayout.ts`: Speaker/SpeakerLayout types, preset factories (stereo/5.1/7.1/7.1.4), generic `computeVBAPGains`
- `SpatialRenderer.ts`: SpatialRenderer interface + WebAudioSpatialRenderer (renderBinaural, renderMultichannel, computeFrame)
- Exporter.ts reduced to thin facade delegating to renderer
- Source limit raised: DEFAULT_MAX_SOURCES=12, ABSOLUTE_MAX_SOURCES=32

---

## Current: Tier 1 -- Engine & Performance

Tier 1 focuses on the audio engine foundation and performance scaling needed before
higher-level features (collaboration, advanced export, spatial media player). Items are
sequenced by dependency -- each step builds on the one before it.

### Tier 1 Status (as of 2026-03-05)

| Item                              | Status      |
|-----------------------------------|-------------|
| SpeakerLayout type                | DONE        |
| SpatialRenderer interface         | DONE        |
| Raise source limit                | DONE        |
| Channel strip (EQ/comp/reverb)    | NOT STARTED |
| Lazy sections                     | NOT STARTED |
| Web Workers                       | NOT STARTED |
| Virtual scroll + GPU waveforms    | NOT STARTED |
| Time-segmented spatial assignments| NOT STARTED |
| Auto-spatialize                   | NOT STARTED |

### Step 1: Channel Strip (EQ / Compressor / Reverb)

Every subsequent feature benefits from a proper mixing chain. Replaces the plugin-based
workaround. The audio graph change (gain -> EQ -> comp -> reverb -> panner) is the most
architecturally sensitive piece.

**Substeps:**
1. Design `ChannelStrip` interface and node graph -- params, how it slots into SourceChannel, coexistence with plugin effects
2. Implement `ChannelStrip.ts`: 3-band EQ (BiquadFilterNode), DynamicsCompressorNode, ConvolutionReverbNode (dry/wet)
3. Wire into SourceChannel audio chain, update AudioBridge to read strip params
4. UI: inline strip controls under each source in SourceList
5. Master channel strip variant on master bus
6. Serialize strip state in project files (bump format version)
7. Export offline render honors strip settings

**Model routing:**
- Substep 1: Cloud Claude (architecture, audio graph design)
- Substeps 2-4: `qwen3-coder` via Pal (Web Audio wiring, component shells, store additions)
- Substep 5: `qwen3-coder` via Pal (mirrors per-source pattern)
- Substeps 6-7: `qwen2.5-coder:32b` via Pal (serialization + offline render, multi-file)

### Step 2: Lazy Sections

Quick win. Reduces mount cost for the growing sidebar. Needed after channel strip adds
more per-source UI.

**Substeps:**
1. Modify `Section.tsx` to conditionally mount children only when expanded (unmount on collapse, optional keep-alive prop)
2. Audit all Section consumers -- ensure no side-effects depend on mounted-while-collapsed state

**Model routing:** `glm-4.7-flash` via Pal -- small, mechanical edit.

### Step 3: Web Workers

MIDI rendering and waveform decoding block the main thread. With channel strip adding
more processing, offloading becomes important.

**Substeps:**
1. Create `src/renderer/workers/decodeWorker.ts` -- offload decodeAudioData via transferable buffers
2. Create `src/renderer/workers/midiRenderWorker.ts` -- offload MidiSynth.renderTrack and SoundFontPlayer.render
3. Worker pool wrapper with queue and promise-based API
4. Integrate into WebAudioEngine.loadFile() and MIDI import flow
5. Verify OfflineAudioContext works in Worker (Chromium/Electron supports this)

**Model routing:**
- Substep 1: Cloud Claude (Worker + Transferable + OfflineAudioContext strategy, electron-vite bundling)
- Substeps 2-4: `qwen3-coder` via Pal (follow pattern from substep 1)
- Substep 5: `qwen2.5-coder:32b` via Pal codereview (review integration)

### Step 4: Virtual Scroll + GPU Waveforms

Rendering performance for high source counts (approaching ABSOLUTE_MAX_SOURCES=32).

**Substeps:**
1. Virtual scroll for SourceList.tsx -- windowed rendering (@tanstack/react-virtual or minimal custom, fixed-height rows)
2. GPU waveforms in TimelinePanel.tsx -- replace Canvas 2D with WebGL, pre-compute min/max per pixel bucket, render as instanced quads
3. Throttle timeline redraws to animation frames, decouple from React render cycle

**Model routing:**
- Substep 1: `qwen3-coder` via Pal (standard virtualization)
- Substep 2: Cloud Claude (WebGL shader design, interaction with R3F canvas)
- Substep 3: `qwen3-coder` via Pal (rAF throttle, mechanical)

### Step 5: Time-Segmented Spatial Assignments

A source can change its spatial rendering mode across the timeline. Depends on
SpeakerLayout (done) and benefits from channel strip.

**Substeps:**
1. Design `SpatialAssignment` type: `{ startTime, endTime, layout: SpeakerLayoutPreset, renderer: 'binaural' | 'multichannel' }`
2. Add `spatialAssignments: SpatialAssignment[]` to AudioSource type
3. Export system reads assignments per time segment, switches renderer accordingly
4. UI: assignment lane in timeline (colored blocks per layout), drag to resize, click to change layout
5. Serialize in project format

**Model routing:**
- Substep 1: Cloud Claude (type design, edge cases -- overlaps, gaps, defaults)
- Substeps 2-3: `qwen2.5-coder:32b` via Pal (multi-file wiring: types, exporter, renderer)
- Substep 4: `qwen3-coder` via Pal (timeline UI, follows automation lane pattern)
- Substep 5: `qwen3-coder` via Pal (serialization, existing pattern)

### Step 6: Auto-Spatialize

The capstone. Depends on channel strip, spatial assignments, and Demucs stem labels.

**Substeps:**
1. **Stem-type defaults:** Demucs stems get auto-assigned positions (vocals center-front, drums center-back, bass center-low, other spread L/R)
2. **Stereo pan extraction:** Analyze stereo source L/R balance over time, generate X-position keyframes mirroring original stereo field
3. **Temporal pan keyframes:** Detect pan automation via windowed RMS comparison, quantize to choreography-compatible keyframes
4. UI: "Auto-Spatialize" button on source context menu and Demucs results panel

**Model routing:**
- Substep 1: `qwen3-coder` via Pal (lookup table, straightforward)
- Substep 2: Cloud Claude (DSP algorithm -- windowed L/R RMS ratio to azimuth mapping)
- Substep 3: `qwen2.5-coder:32b` via Pal (implement DSP from Claude's design)
- Substep 4: `qwen3-coder` via Pal (button + hook wiring)

### Tier 1 Model Budget

| Step | Sessions | Cloud Claude | Local (Pal) |
|------|----------|-------------|-------------|
| 1 Channel Strip    | 3-4 | Architecture, audio graph | Implementation, UI, serialization |
| 2 Lazy Sections    | 0.5 | --                        | All (glm-4.7-flash) |
| 3 Web Workers      | 2-3 | Worker strategy, bundling | Implementation, integration |
| 4 Virtual+GPU      | 2   | WebGL shader design       | Virtualization, throttle |
| 5 Spatial Segments | 3   | Type design, edge cases   | Multi-file wiring, UI, serialization |
| 6 Auto-Spatialize  | 2-3 | DSP algorithm design      | Implementation, UI |
| **Total**          | **~13-16** | **~20%** | **~80%** |

---

## Future Tiers

### Tier 2: Collaboration & Advanced Export
- Export project as shareable package, import/merge projects
- Session notes and markers on timeline
- Video export with embedded spatial audio (ffmpeg mux)
- Ambisonic export (AmbiX B-format)
- Real-time binaural preview recording
- Batch export presets

### Tier 3: Spatial Media Player (v3.0)
- MKV/multi-container playback with FFmpeg-based demuxer
- Multi-channel to 3D source mapping (7.1.4 channels as positioned sources)
- Per-channel "Speaker Dome" visualizer with energy heatmap timeline
- Atmos bed channel support (7.1.4 decode)
- Channel solo in 3D (click speaker orb to solo)
- Network sync, head tracking, collaborative editing
- Web player export (static HTML+JS bundle)
