import { create } from 'zustand'
import type { AppState, AudioSource, SourceId, SourceType, EasingType, SourceAnimation } from '../types'
import { SOURCE_COLORS, MAX_SOURCES } from '../types'

let nextSourceIndex = 1

/**
 * Creates a default audio source configuration with initial values.
 * Used to initialize new sources in the spatial audio editor.
 */
function createDefaultSource(index: number, type: SourceType): AudioSource {
  return {
    id: crypto.randomUUID(),
    label: `Source ${index}`,
    sourceType: type,
    position: [2 + (index - 1) * 1.5, 1, (index - 1) * 1.5],
    volume: 1.0,
    color: SOURCE_COLORS[(index - 1) % SOURCE_COLORS.length],
    audioFileName: null,
    sineFrequency: 440,
    isMuted: false,
    isSoloed: false,
  }
}

const initialSource = createDefaultSource(1, 'file')

/**
 * Zustand store for managing the application state in SonarLox.
 * Handles audio sources, animations, playback controls, and project settings.
 */
export const useAppStore = create<AppState>((set, get) => ({
  sources: [initialSource],
  selectedSourceId: initialSource.id,

  /**
   * Adds a new audio source to the scene.
   * Creates a new source with default configuration and selects it.
   */
  addSource: (type: SourceType) => {
    const { sources } = get()
    if (sources.length >= MAX_SOURCES) return
    nextSourceIndex++
    const newSource = createDefaultSource(nextSourceIndex, type)
    set({ sources: [...sources, newSource], selectedSourceId: newSource.id, isDirty: true })
  },

  /**
   * Removes an audio source from the scene.
   * Updates selection if the removed source was selected.
   */
  removeSource: (id: SourceId) => {
    const { sources, selectedSourceId, animations } = get()
    if (sources.length <= 1) return
    const filtered = sources.filter((s) => s.id !== id)
    const newSelected =
      selectedSourceId === id ? filtered[0]?.id ?? null : selectedSourceId
    const nextAnimations = { ...animations }
    delete nextAnimations[id]
    set({ sources: filtered, selectedSourceId: newSelected, animations: nextAnimations, isDirty: true })
  },

  /**
   * Selects an audio source by ID.
   * Updates the currently selected source in the UI.
   */
  selectSource: (id: SourceId | null) => set({ selectedSourceId: id }),

  /**
   * Updates the position of an audio source in 3D space.
   * Used for spatial positioning of audio objects.
   */
  setSourcePosition: (id, position) =>
    set((state) => ({
      sources: state.sources.map((s) => (s.id === id ? { ...s, position } : s)),
      isDirty: true,
    })),

  /**
   * Updates the volume of an audio source.
   * Controls the loudness of individual audio sources.
   */
  setSourceVolume: (id, volume) =>
    set((state) => ({
      sources: state.sources.map((s) => (s.id === id ? { ...s, volume } : s)),
      isDirty: true,
    })),

  /**
   * Sets the audio file name for a source.
   * Links a source to an actual audio file for playback.
   */
  setSourceAudioFileName: (id, audioFileName) =>
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === id ? { ...s, audioFileName } : s
      ),
      isDirty: true,
    })),

  /**
   * Sets the sine wave frequency for a source.
   * Used for generating tone-based audio sources.
   */
  setSourceSineFrequency: (id, sineFrequency) =>
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === id ? { ...s, sineFrequency } : s
      ),
      isDirty: true,
    })),

  /**
   * Mutes or unmutes an audio source.
   * Temporarily silences a source without removing it.
   */
  setSourceMuted: (id, isMuted) =>
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === id ? { ...s, isMuted } : s
      ),
      isDirty: true,
    })),

  /**
   * Solos or unsolos an audio source.
   * When soloed, only this source plays while others are muted.
   */
  setSourceSoloed: (id, isSoloed) =>
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === id ? { ...s, isSoloed } : s
      ),
      isDirty: true,
    })),

  /**
   * Updates the label of an audio source.
   * Used for identifying sources in the UI.
   */
  setSourceLabel: (id, label) =>
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === id ? { ...s, label } : s
      ),
      isDirty: true,
    })),

  // Animation
  animations: {},
  isRecordingKeyframes: false,
  recordQuantize: 0.1,

  /**
   * Records a keyframe for an animation at a specific time.
   * Used to define position changes over time for spatial audio.
   */
  setKeyframe: (sourceId: SourceId, time: number, position, easing: EasingType = 'linear') => {
    const { animations, recordQuantize } = get()
    const quantizedTime = recordQuantize > 0
      ? Math.round(time / recordQuantize) * recordQuantize
      : time

    const existing = animations[sourceId] ?? { sourceId, keyframes: [] }
    const EPSILON = 0.001
    const filtered = existing.keyframes.filter((kf) => Math.abs(kf.time - quantizedTime) > EPSILON)
    const keyframes = [...filtered, { time: quantizedTime, position, easing }]
      .sort((a, b) => a.time - b.time)

    set({
      animations: { ...animations, [sourceId]: { sourceId, keyframes } },
      isDirty: true,
    })
  },

  /**
   * Removes a keyframe from an animation at a specific time.
   * Used to clean up animation data.
   */
  removeKeyframe: (sourceId: SourceId, time: number) => {
    const { animations } = get()
    const anim = animations[sourceId]
    if (!anim) return
    const EPSILON = 0.001
    const keyframes = anim.keyframes.filter((kf) => Math.abs(kf.time - time) > EPSILON)
    if (keyframes.length === 0) {
      const next = { ...animations }
      delete next[sourceId]
      set({ animations: next, isDirty: true })
    } else {
      set({
        animations: { ...animations, [sourceId]: { ...anim, keyframes } },
        isDirty: true,
      })
    }
  },

  /**
   * Clears all keyframes for a specific source.
   * Removes animation data for a source.
   */
  clearAnimation: (sourceId: SourceId) => {
    const { animations } = get()
    if (!animations[sourceId]) return
    const next = { ...animations }
    delete next[sourceId]
    set({ animations: next, isDirty: true })
  },

  /**
   * Toggles recording mode for keyframes.
   * Enables or disables keyframe recording in the animation timeline.
   */
  setIsRecordingKeyframes: (isRecordingKeyframes) => set({ isRecordingKeyframes }),
  setRecordQuantize: (recordQuantize) => set({ recordQuantize }),

  /**
   * Sound font name for synthesizer sources.
   * Used for loading and applying sound fonts to MIDI-based sources.
   */
  soundFontName: null,
  setSoundFontName: (soundFontName) => set({ soundFontName }),

  /**
   * Current project file path.
   * Tracks the location of the currently loaded project.
   */
  currentProjectPath: null,
  projectTitle: 'Untitled',
  isDirty: false,
  setCurrentProjectPath: (currentProjectPath) => set({ currentProjectPath }),
  setProjectTitle: (projectTitle) => set({ projectTitle, isDirty: true }),
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),

  /**
   * Playback state controls.
   * Manages whether the audio is currently playing or looping.
   */
  isPlaying: false,
  isLooping: true,
  listenerY: 0,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsLooping: (isLooping) => set({ isLooping }),
  setListenerY: (listenerY) => set({ listenerY, isDirty: true }),

  /**
   * Export state controls.
   * Manages export progress and status for audio file exports.
   */
  isExporting: false,
  setIsExporting: (isExporting) => set({ isExporting }),
  exportProgress: 0,
  setExportProgress: (exportProgress) => set({ exportProgress }),

  /**
   * Master volume control.
   * Adjusts the overall volume of the spatial audio scene.
   */
  masterVolume: 1.0,
  setMasterVolume: (masterVolume) => set({ masterVolume, isDirty: true }),
  selectedOutputDevice: null,
  setSelectedOutputDevice: (selectedOutputDevice) => set({ selectedOutputDevice }),

  /**
   * Camera presets for 3D view navigation.
   * Stores and recalls camera positions for quick access.
   */
  cameraPresets: [null, null, null, null],
  setCameraPreset: (index, preset) =>
    set((state) => {
      const next = [...state.cameraPresets]
      next[index] = preset
      return { cameraPresets: next }
    }),
  cameraCommand: null,
  setCameraCommand: (cameraCommand) => set({ cameraCommand }),
}))
