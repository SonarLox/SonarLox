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
  setListenerY: (listenerY) => set({ listenerY })
}))
