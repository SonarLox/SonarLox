import { useRef, useEffect, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Vector3, Plane, Raycaster, type Mesh, type MeshStandardMaterial } from 'three'
import { useAppStore } from '../stores/useAppStore'
import { audioEngine } from '../audio/AudioEngine'

const BASE_SCALE = 0.3
const MAX_SCALE = 0.45
const BASE_EMISSIVE = 0.3
const MAX_EMISSIVE = 1.0
const THROTTLE_MS = 64 // ~15hz store updates during drag for UI readout

const MIN_BOUNDS: [number, number, number] = [-10, 0, -10]
const MAX_BOUNDS: [number, number, number] = [10, 10, 10]

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

export function SoundSource() {
  const meshRef = useRef<Mesh>(null)
  const setSourcePosition = useAppStore((s) => s.setSourcePosition)
  const sourcePosition = useAppStore((s) => s.sourcePosition)
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null
  const camera = useThree((s) => s.camera)
  const lastStoreUpdate = useRef(0)

  // Drag state — refs only, no React state
  const isDragging = useRef(false)
  const dragOffset = useRef(new Vector3())
  const dragPlane = useRef(new Plane())
  const hitPoint = useRef(new Vector3())
  const shiftHeld = useRef(false)

  const analyserRef = useRef<AnalyserNode | null>(null)
  const timeDomainRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  useEffect(() => {
    const analyser = audioEngine.getAnalyser()
    analyserRef.current = analyser
    if (analyser) {
      timeDomainRef.current = new Uint8Array(analyser.fftSize)
    }
  })

  // Throttled store commit during drag
  const commitPosition = useCallback((x: number, y: number, z: number, force: boolean) => {
    const now = performance.now()
    if (force || now - lastStoreUpdate.current > THROTTLE_MS) {
      lastStoreUpdate.current = now
      setSourcePosition([x, y, z])
    }
  }, [setSourcePosition])

  const onPointerDown = useCallback((event: { stopPropagation: () => void; pointerId: number; target: EventTarget; shiftKey: boolean; ray: Raycaster['ray'] }) => {
    event.stopPropagation()
    isDragging.current = true
    shiftHeld.current = event.shiftKey

    // Set pointer capture so we get move/up even if pointer leaves the mesh
    const el = event.target as HTMLElement
    if (el.setPointerCapture) el.setPointerCapture(event.pointerId)

    // Build drag plane at sphere's current position
    const [sx, sy, sz] = useAppStore.getState().sourcePosition
    const spherePos = new Vector3(sx, sy, sz)

    if (event.shiftKey) {
      // XY plane: normal facing camera on Z axis
      dragPlane.current.setFromNormalAndCoplanarPoint(
        new Vector3(0, 0, 1).applyQuaternion(camera.quaternion).setY(0).normalize().length() > 0.01
          ? new Vector3(0, 0, 1).applyQuaternion(camera.quaternion).setY(0).normalize()
          : new Vector3(0, 0, 1),
        spherePos
      )
    } else {
      // XZ plane at sphere's Y
      dragPlane.current.setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), spherePos)
    }

    // Calculate offset between hit point and sphere center
    if (event.ray.intersectPlane(dragPlane.current, hitPoint.current)) {
      dragOffset.current.copy(hitPoint.current).sub(spherePos)
    } else {
      dragOffset.current.set(0, 0, 0)
    }

    if (controls) controls.enabled = false
  }, [camera, controls])

  const onPointerMove = useCallback((event: { stopPropagation: () => void; shiftKey: boolean; ray: Raycaster['ray'] }) => {
    if (!isDragging.current) return
    event.stopPropagation()

    // Update plane if shift state changed mid-drag
    if (event.shiftKey !== shiftHeld.current) {
      shiftHeld.current = event.shiftKey
      const [sx, sy, sz] = useAppStore.getState().sourcePosition
      const spherePos = new Vector3(sx, sy, sz)
      if (event.shiftKey) {
        dragPlane.current.setFromNormalAndCoplanarPoint(
          new Vector3(0, 0, 1).applyQuaternion(camera.quaternion).setY(0).normalize().length() > 0.01
            ? new Vector3(0, 0, 1).applyQuaternion(camera.quaternion).setY(0).normalize()
            : new Vector3(0, 0, 1),
          spherePos
        )
      } else {
        dragPlane.current.setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), spherePos)
      }
      // Recalculate offset for smooth transition
      if (event.ray.intersectPlane(dragPlane.current, hitPoint.current)) {
        dragOffset.current.copy(hitPoint.current).sub(spherePos)
      }
    }

    if (!event.ray.intersectPlane(dragPlane.current, hitPoint.current)) return

    const x = clamp(hitPoint.current.x - dragOffset.current.x, MIN_BOUNDS[0], MAX_BOUNDS[0])
    const y = clamp(hitPoint.current.y - dragOffset.current.y, MIN_BOUNDS[1], MAX_BOUNDS[1])
    const z = clamp(hitPoint.current.z - dragOffset.current.z, MIN_BOUNDS[2], MAX_BOUNDS[2])

    // In XZ mode, preserve current Y; in XY mode, preserve current Z
    const [, curY, , ] = useAppStore.getState().sourcePosition
    const [, , curZ] = useAppStore.getState().sourcePosition
    if (!shiftHeld.current) {
      commitPosition(x, curY, z, false)
    } else {
      commitPosition(x, y, curZ, false)
    }
  }, [camera, commitPosition])

  const onPointerUp = useCallback((event: { stopPropagation: () => void; pointerId: number; target: EventTarget }) => {
    if (!isDragging.current) return
    isDragging.current = false

    const el = event.target as HTMLElement
    if (el.releasePointerCapture) {
      try { el.releasePointerCapture(event.pointerId) } catch { /* already released */ }
    }

    if (controls) controls.enabled = true

    // Final commit
    const [x, y, z] = useAppStore.getState().sourcePosition
    commitPosition(x, y, z, true)
  }, [controls, commitPosition])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const analyser = analyserRef.current ?? audioEngine.getAnalyser()
    if (!analyser) {
      const s = BASE_SCALE / 0.3
      mesh.scale.setScalar(s)
      return
    }

    if (!timeDomainRef.current) {
      analyserRef.current = analyser
      timeDomainRef.current = new Uint8Array(analyser.fftSize)
    }

    const data = timeDomainRef.current
    analyser.getByteTimeDomainData(data)

    let sumSq = 0
    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128
      sumSq += normalized * normalized
    }
    const rms = Math.sqrt(sumSq / data.length)
    const amplitude = Math.min(rms * 3, 1)

    const targetScale = (BASE_SCALE + amplitude * (MAX_SCALE - BASE_SCALE)) / 0.3
    mesh.scale.setScalar(targetScale)

    const mat = mesh.material as MeshStandardMaterial
    mat.emissiveIntensity = BASE_EMISSIVE + amplitude * (MAX_EMISSIVE - BASE_EMISSIVE)
  })

  return (
    <mesh
      ref={meshRef}
      position={sourcePosition}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial color="#ff6622" emissive="#ff6622" emissiveIntensity={0.3} />
    </mesh>
  )
}
