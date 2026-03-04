import { useFrame } from '@react-three/fiber'
import { audioEngine } from '../audio/AudioEngine'
import { useAppStore } from '../stores/useAppStore'

export function AudioBridge() {
  useFrame(() => {
    const state = useAppStore.getState()
    const [x, y, z] = state.sourcePosition
    audioEngine.setPosition(x, y, z)
    audioEngine.setListenerY(state.listenerY)
  })

  return null
}
