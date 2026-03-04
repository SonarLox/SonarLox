export type SourcePosition = [number, number, number]

export interface CameraPreset {
  position: [number, number, number]
  target: [number, number, number]
}

export type CameraCommand =
  | { type: 'home' }
  | { type: 'recall'; index: number }
  | { type: 'save'; index: number }
  | null

export interface AppState {
  sourcePosition: SourcePosition
  isPlaying: boolean
  isLooping: boolean
  audioFileName: string | null
  volume: number
  listenerY: number
  setSourcePosition: (position: SourcePosition) => void
  setIsPlaying: (isPlaying: boolean) => void
  setIsLooping: (isLooping: boolean) => void
  setAudioFileName: (name: string | null) => void
  setVolume: (volume: number) => void
  setListenerY: (y: number) => void
  cameraPresets: (CameraPreset | null)[]
  setCameraPreset: (index: number, preset: CameraPreset | null) => void
  cameraCommand: CameraCommand
  setCameraCommand: (cmd: CameraCommand) => void
  sineFrequency: number
  setSineFrequency: (freq: number) => void
}

export interface AudioFileResult {
  buffer: ArrayBuffer
  name: string
}

export interface SaveWavResult {
  saved: boolean
  path?: string
}

export interface ElectronAPI {
  openAudioFile: () => Promise<AudioFileResult | null>
  saveWavFile: (buffer: ArrayBuffer) => Promise<SaveWavResult>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
