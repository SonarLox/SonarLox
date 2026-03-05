import { StateCreator } from 'zustand'
import { AppState } from '../../types'

export interface ProjectSlice {
  currentProjectPath: string | null
  projectTitle: string
  isDirty: boolean
  soundFontName: string | null
  masterVolume: number
  selectedOutputDevice: string | null
  listenerY: number
  roomSize: [number, number]
  bpm: number

  setCurrentProjectPath: (path: string | null) => void
  setProjectTitle: (title: string) => void
  markDirty: () => void
  markClean: () => void
  setSoundFontName: (name: string | null) => void
  setMasterVolume: (vol: number) => void
  setSelectedOutputDevice: (id: string | null) => void
  setListenerY: (y: number) => void
  setRoomSize: (size: [number, number]) => void
  setBpm: (bpm: number) => void
}

export const createProjectSlice: StateCreator<AppState, [], [], ProjectSlice> = (set, get) => ({
  currentProjectPath: null,
  projectTitle: 'Untitled',
  isDirty: false,
  soundFontName: null,
  masterVolume: 1.0,
  selectedOutputDevice: null,
  listenerY: 0,
  roomSize: [20, 20],
  bpm: 120,

  setCurrentProjectPath: (currentProjectPath) => set({ currentProjectPath }),
  setProjectTitle: (projectTitle) => set({ projectTitle, isDirty: true }),
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
  setSoundFontName: (soundFontName) => set({ soundFontName }),
  setMasterVolume: (masterVolume) => set({ masterVolume, isDirty: true }),
  setSelectedOutputDevice: (selectedOutputDevice) => set({ selectedOutputDevice }),
  setListenerY: (listenerY) => set({ listenerY, isDirty: true }),
  setRoomSize: (roomSize) => {
    get().recordHistory('Change room size')
    set({ roomSize, isDirty: true })
  },
  setBpm: (bpm) => {
    get().recordHistory('Change BPM')
    set({ bpm: Math.max(1, Math.min(999, bpm)), isDirty: true })
  },
})
