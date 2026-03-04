import { create } from 'zustand'
import type { AppState } from '../types'

export const useAppStore = create<AppState>((set) => ({
  sourcePosition: [2, 1, 0],
  isPlaying: false,
  audioFileName: null,
  volume: 1.0,
  setSourcePosition: (position) => set({ sourcePosition: position }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setAudioFileName: (audioFileName) => set({ audioFileName }),
  setVolume: (volume) => set({ volume })
}))
