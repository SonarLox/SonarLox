import { create } from 'zustand'
import { audioEngine } from '../audio/WebAudioEngine'
import { useAppStore } from './useAppStore'

/**
 * State interface for the transport controls in the spatial audio editor.
 * Manages playback status, playhead position, and audio duration.
 */
export interface TransportState {
  isPlaying: boolean
  isPaused: boolean
  playheadPosition: number
  duration: number
  isLooping: boolean
  play: () => void
  pause: () => void
  stop: () => void
  seek: (pos: number) => void
  toggleLoop: () => void
  updatePlayhead: (pos: number) => void
  refreshDuration: () => void
}

let playheadInterval: number | null = null

function startPlayheadLoop(set: any, get: any) {
  if (playheadInterval) return
  playheadInterval = window.setInterval(() => {
    const pos = audioEngine.getPlayheadPosition()
    const duration = audioEngine.getDuration()
    set({ playheadPosition: pos, duration })

    // Stop if reached end and not looping
    if (!get().isLooping && pos >= duration && duration > 0) {
      get().stop()
    }
  }, 33) as unknown as number
}

function stopPlayheadLoop() {
  if (playheadInterval) {
    clearInterval(playheadInterval)
    playheadInterval = null
  }
}

export const useTransportStore = create<TransportState>((set, get) => ({
  isPlaying: false,
  isPaused: false,
  playheadPosition: 0,
  duration: 0,
  isLooping: true,

  play: () => {
    audioEngine.playAll()
    set({ isPlaying: true, isPaused: false })
    useAppStore.getState().setIsPlaying(true)
    startPlayheadLoop(set, get)
  },

  pause: () => {
    audioEngine.pauseAll()
    set({ isPlaying: false, isPaused: true })
    useAppStore.getState().setIsPlaying(false)
    stopPlayheadLoop()
  },

  stop: () => {
    audioEngine.stopAll()
    set({ isPlaying: false, isPaused: false, playheadPosition: 0 })
    useAppStore.getState().setIsPlaying(false)
    stopPlayheadLoop()
  },

  seek: (pos: number) => {
    audioEngine.setPlayheadPosition(pos)
    set({ playheadPosition: pos })
  },

  toggleLoop: () => {
    const next = !get().isLooping
    audioEngine.setLooping(next)
    set({ isLooping: next })
    useAppStore.getState().setIsLooping(next)
  },

  updatePlayhead: (pos: number) => {
    const duration = audioEngine.getDuration()
    set({ playheadPosition: pos, duration })

    if (!get().isLooping && pos >= duration && duration > 0) {
      get().stop()
    }
  },

  refreshDuration: () => {
    set({ duration: audioEngine.getDuration() })
  },
}))
