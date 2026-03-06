import { useRef, useEffect, useCallback, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Vector3, Plane, Raycaster, Color, type Mesh, type MeshStandardMaterial } from 'three'
import { useAppStore } from '../stores/useAppStore'
import { useTransportStore } from '../stores/useTransportStore'
import { audioEngine } from '../audio/WebAudioEngine'
import { getAnimatedPosition } from '../audio/AnimationEngine'
import type { SourceId, AudioSource } from '../types'
import { clamp, THROTTLE_MS } from '../utils/math'

const BASE_SCALE = 0.3
const MAX_SCALE = 0.45
const BASE_EMISSIVE = 0.3
const MAX_EMISSIVE = 1.0
const SELECTED_EMISSIVE_BOOST = 0.4

/**
 * Hook to handle dragging logic for sound sources
 */
function useSourceDrag(sourceId: SourceId, getSource: () => AudioSource | undefined) {
  const selectSource = useAppStore((s) => s.selectSource)
  const setSourcePosition = useAppStore((s) => s.setSourcePosition)
  const roomSize = useAppStore((s) => s.roomSize)
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null
  const camera = useThree((s) => s.camera)
  
  const isDragging = useRef(false)
  const dragOffset = useRef(new Vector3())
  const dragPlane = useRef(new Plane())
  const hitPoint = useRef(new Vector3())
  const shiftHeld = useRef(false)
  const lastStoreUpdate = useRef(0)

  const commitPosition = useCallback(
    (x: number, y: number, z: number, force: boolean) => {
      const now = performance.now()
      if (force || now - lastStoreUpdate.current > THROTTLE_MS) {
        lastStoreUpdate.current = now
        setSourcePosition(sourceId, [x, y, z])

        const { isRecordingKeyframes, setKeyframe } = useAppStore.getState()
        const transport = useTransportStore.getState()
        if (isRecordingKeyframes) {
          setKeyframe(sourceId, transport.playheadPosition, [x, y, z])
        }
      }
    },
    [sourceId, setSourcePosition]
  )

  const onPointerDown = useCallback(
    (event: {
      stopPropagation: () => void
      pointerId: number
      target: EventTarget
      shiftKey: boolean
      ray: Raycaster['ray']
    }) => {
      event.stopPropagation()
      const source = getSource()
      if (!source) return

      selectSource(sourceId)
      isDragging.current = true
      shiftHeld.current = event.shiftKey

      const el = event.target as HTMLElement
      if (el.setPointerCapture) el.setPointerCapture(event.pointerId)

      const [sx, sy, sz] = source.position
      const spherePos = new Vector3(sx, sy, sz)

      if (event.shiftKey) {
        const normal = new Vector3(0, 0, 1).applyQuaternion(camera.quaternion).setY(0).normalize()
        dragPlane.current.setFromNormalAndCoplanarPoint(
          normal.length() > 0.01 ? normal : new Vector3(0, 0, 1),
          spherePos
        )
      } else {
        dragPlane.current.setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), spherePos)
      }

      if (event.ray.intersectPlane(dragPlane.current, hitPoint.current)) {
        dragOffset.current.copy(hitPoint.current).sub(spherePos)
      }

      // eslint-disable-next-line react-hooks/immutability
      if (controls) controls.enabled = false
    },
    [camera, controls, sourceId, selectSource, getSource]
  )

  const onPointerMove = useCallback(
    (event: {
      stopPropagation: () => void
      shiftKey: boolean
      ray: Raycaster['ray']
    }) => {
      if (!isDragging.current) return
      event.stopPropagation()

      const source = getSource()
      if (!source) return

      if (event.shiftKey !== shiftHeld.current) {
        shiftHeld.current = event.shiftKey
        const [sx, sy, sz] = source.position
        const spherePos = new Vector3(sx, sy, sz)
        if (event.shiftKey) {
          const normal = new Vector3(0, 0, 1).applyQuaternion(camera.quaternion).setY(0).normalize()
          dragPlane.current.setFromNormalAndCoplanarPoint(
            normal.length() > 0.01 ? normal : new Vector3(0, 0, 1),
            spherePos
          )
        } else {
          dragPlane.current.setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), spherePos)
        }
        if (event.ray.intersectPlane(dragPlane.current, hitPoint.current)) {
          dragOffset.current.copy(hitPoint.current).sub(spherePos)
        }
      }

      if (!event.ray.intersectPlane(dragPlane.current, hitPoint.current)) return

      const [width, depth] = roomSize
      const minX = -width / 2
      const maxX = width / 2
      const minZ = -depth / 2
      const maxZ = depth / 2

      const x = clamp(hitPoint.current.x - dragOffset.current.x, minX, maxX)
      const y = clamp(hitPoint.current.y - dragOffset.current.y, 0, 10)
      const z = clamp(hitPoint.current.z - dragOffset.current.z, minZ, maxZ)

      if (!shiftHeld.current) {
        commitPosition(x, source.position[1], z, false)
      } else {
        commitPosition(x, y, source.position[2], false)
      }
    },
    [camera, commitPosition, getSource, roomSize]
  )

  const onPointerUp = useCallback(
    (event: {
      stopPropagation: () => void
      pointerId: number
      target: EventTarget
    }) => {
      if (!isDragging.current) return
      isDragging.current = false

      const el = event.target as HTMLElement
      if (el.releasePointerCapture) {
        try { el.releasePointerCapture(event.pointerId) } catch { /* ignore */ }
      }

      // eslint-disable-next-line react-hooks/immutability
      if (controls) controls.enabled = true

      const source = getSource()
      if (source) {
        useAppStore.getState().recordHistory('Move source')
        commitPosition(source.position[0], source.position[1], source.position[2], true)
      }
    },
    [controls, commitPosition, getSource]
  )

  return { onPointerDown, onPointerMove, onPointerUp, isDragging: isDragging.current }
}

/**
 * Main SoundSource Component
 */
export function SoundSource({ sourceId }: { sourceId: SourceId }) {
  const meshRef = useRef<Mesh>(null)
  const getSource = useCallback(() => useAppStore.getState().sources.find((s) => s.id === sourceId), [sourceId])
  const { onPointerDown, onPointerMove, onPointerUp, isDragging } = useSourceDrag(sourceId, getSource)

  const analyserRef = useRef<AnalyserNode | null>(null)
  const timeDomainRef = useRef<Uint8Array | null>(null)
  const baseColorRef = useRef(new Color())
  const rearColorRef = useRef(new Color())
  const tempColor = useRef(new Color())

  useEffect(() => {
    const analyser = audioEngine.getAnalyser(sourceId)
    analyserRef.current = analyser
    if (analyser) timeDomainRef.current = new Uint8Array(analyser.fftSize)
  }, [sourceId])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const state = useAppStore.getState()
    const isRecording = state.isRecordingKeyframes
    const transport = useTransportStore.getState()
    const source = getSource()
    if (!source) return

    // Position updates
    if (!isDragging) {
      const useAnimation = transport.isPlaying || transport.isPaused
      if (useAnimation && state.animations[sourceId]?.keyframes.length) {
        const pos = getAnimatedPosition(sourceId, transport.playheadPosition, state.animations, source.position)
        mesh.position.set(...pos)
      } else {
        mesh.position.set(...source.position)
      }
    } else {
      mesh.position.set(...source.position)
    }

    // Appearance updates
    const isSelected = state.selectedSourceId === sourceId
    const azimuthAngle = Math.atan2(mesh.position.x, -mesh.position.z)
    const absAzimuth = Math.abs(azimuthAngle)
    const mat = mesh.material as MeshStandardMaterial
    
    // Audio amplitude
    let amplitude = 0
    if (analyserRef.current && timeDomainRef.current) {
      analyserRef.current.getByteTimeDomainData(timeDomainRef.current)
      let sumSq = 0
      for (let i = 0; i < timeDomainRef.current.length; i++) {
        const normalized = (timeDomainRef.current[i] - 128) / 128
        sumSq += normalized * normalized
      }
      amplitude = Math.min(Math.sqrt(sumSq / timeDomainRef.current.length) * 3, 1)
    }

    // Scale
    const targetScale = (BASE_SCALE + amplitude * (MAX_SCALE - BASE_SCALE)) / 0.3
    mesh.scale.setScalar(targetScale)

    // Emissive intensity & Color
    let baseE = isSelected ? BASE_EMISSIVE + SELECTED_EMISSIVE_BOOST : BASE_EMISSIVE
    if (isRecording) {
      const pulse = (Math.sin(performance.now() * 0.01) + 1) * 0.5
      mat.emissive.lerp(new Color('#ff0000'), pulse * 0.6)
      baseE += pulse * 0.3
    } else {
      if (absAzimuth > Math.PI / 2) {
        const t = Math.min((absAzimuth - Math.PI / 2) / (Math.PI / 2), 1)
        tempColor.current.copy(baseColorRef.current).lerp(rearColorRef.current, t)
        mat.emissive.copy(tempColor.current)
      } else {
        mat.emissive.copy(baseColorRef.current)
      }
    }
    mat.emissiveIntensity = baseE + amplitude * (MAX_EMISSIVE - baseE)
  })

  const source = useAppStore((s) => s.sources.find((src) => src.id === sourceId))
  const color = source?.color ?? '#ff6622'

  useEffect(() => {
    baseColorRef.current.set(color)
    const hsl = { h: 0, s: 0, l: 0 }
    baseColorRef.current.getHSL(hsl)
    rearColorRef.current.setHSL(hsl.h * 0.6 + 0.6 * 0.65, hsl.s * 0.4, hsl.l * 0.7)
  }, [color])

  return (
    <mesh ref={meshRef} position={source?.position ?? [0, 0, 0]}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
    </mesh>
  )
}

export function KeyframeGhosts({ sourceId }: { sourceId: SourceId }) {
  const animations = useAppStore((s) => s.animations)
  const source = useAppStore((s) => s.sources.find((src) => src.id === sourceId))
  const keyframes = useMemo(() => animations[sourceId]?.keyframes ?? [], [animations, sourceId])
  if (keyframes.length === 0 || !source) return null
  return (
    <group>
      {keyframes.map((kf, i) => (
        <mesh key={`${sourceId}-ghost-${i}`} position={kf.position}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={source.color} transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  )
}
