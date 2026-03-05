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

---

## Planned

### Phase 20: Spatial Choreography Engine
- Procedural motion primitives that generate keyframe arrays from psychoacoustic principles
- 12+ named behaviours covering tension, intimacy, release, disorientation, conversation
- `ChoreographyBehaviour` union type with per-primitive parameter interfaces
- Single entry point: `generateKeyframes(behaviour, context) -> GeneratedKeyframes`
- `useChoreography` hook wiring to AnimationSlice (setKeyframe) and TransportStore (bpm, duration)
- Two-phase build: Opus designs spec + briefs, Qwen3-Coder implements one primitive per session
- Files: `src/renderer/audio/Choreography.ts`, `src/renderer/hooks/useChoreography.ts`
- Design doc: `docs/CHOREOGRAPHY.md`, API spec: `CHOREOGRAPHY_SPEC.md`

### Phase 21: Advanced Plugin UI (Complete)
- Plugin panels use Section component for consistent collapsible UI
- Plugin parameter presets (save/recall)
- Plugin chain reordering via drag & drop
- Custom plugin visualizer panels docked in sidebar

### Phase 22: Collaboration & Sharing
- Export project as shareable package
- Import/merge projects
- Session notes and markers on timeline

### Phase 23: Advanced Export
- Video export with embedded spatial audio (ffmpeg mux)
- Ambisonic export (AmbiX B-format)
- Real-time binaural preview recording
- Batch export presets

### Phase 24: Performance & Scale
- Web Worker offloading for MIDI rendering
- Lazy section rendering (only mount when expanded)
- Virtual scrolling for large source lists
- GPU-accelerated waveform rendering

### v3.0: Spatial Media Player
- MKV/multi-container playback with FFmpeg-based demuxer
- Multi-channel to 3D source mapping (7.1.4 channels as positioned sources)
- Per-channel "Speaker Dome" visualizer with energy heatmap timeline
- Atmos bed channel support (7.1.4 decode)
- Channel solo in 3D (click speaker orb to solo)
- Network sync, head tracking, collaborative editing
- Web player export (static HTML+JS bundle)
