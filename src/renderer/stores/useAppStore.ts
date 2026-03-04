import { create } from 'zustand'
import type { AppState } from '../types'

export const useAppStore = create<AppState>((set) => ({
  sourcePosition: [2, 1, 0],
  isPlaying: false,
  isLooping: true,
  audioFileName: null,
  volume: 1.0,
  listenerY: 0,
  setSourcePosition: (position) => set({ sourcePosition: position }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsLooping: (isLooping) => set({ isLooping }),
  setAudioFileName: (audioFileName) => set({ audioFileName }),
  setVolume: (volume) => set({ volume }),
  setListenerY: (listenerY) => set({ listenerY }),
  cameraPresets: [null, null, null, null],
  setCameraPreset: (index, preset) =>
    set((state) => {
      const next = [...state.cameraPresets]
      next[index] = preset
      return { cameraPresets: next }
    }),
  cameraCommand: null,
  setCameraCommand: (cameraCommand) => set({ cameraCommand }),
  sineFrequency: 440,
  setSineFrequency: (sineFrequency) => set({ sineFrequency })
}))
