import { useFrame } from '@react-three/fiber'
import { useAppStore } from '../stores/useAppStore'
import { audioEngine } from '../audio/AudioEngine'

export function AudioBridge() {
  const sourcePosition = useAppStore((s) => s.sourcePosition)

  useFrame(() => {
    audioEngine.setPosition(sourcePosition[0], sourcePosition[1], sourcePosition[2])
  })

  return null
}
