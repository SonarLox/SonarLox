import { useThree, useFrame } from '@react-three/fiber'
import { useAppStore } from '../stores/useAppStore'

const HOME_POSITION: [number, number, number] = [8, 6, 8]
const HOME_TARGET: [number, number, number] = [0, 0, 0]

export function CameraManager() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as {
    target: { set: (x: number, y: number, z: number) => void }
    update: () => void
  } | null

  useFrame(() => {
    const { cameraCommand, setCameraCommand, setCameraPreset } = useAppStore.getState()
    if (!cameraCommand || !controls) return

    if (cameraCommand.type === 'home') {
      camera.position.set(...HOME_POSITION)
      controls.target.set(...HOME_TARGET)
      controls.update()
    } else if (cameraCommand.type === 'recall') {
      const preset = useAppStore.getState().cameraPresets[cameraCommand.index]
      if (preset) {
        camera.position.set(...preset.position)
        controls.target.set(...preset.target)
        controls.update()
      }
    } else if (cameraCommand.type === 'save') {
      const target = controls.target as unknown as { x: number; y: number; z: number }
      setCameraPreset(cameraCommand.index, {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [target.x, target.y, target.z]
      })
    }

    setCameraCommand(null)
  })

  return null
}
