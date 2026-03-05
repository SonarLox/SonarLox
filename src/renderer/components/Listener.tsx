import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Shape, DoubleSide } from 'three'
import { useAppStore } from '../stores/useAppStore'

function createWedgeShape(radius: number, angleDeg: number): Shape {
  const halfAngle = (angleDeg / 2) * (Math.PI / 180)
  const shape = new Shape()
  shape.moveTo(0, 0)
  // Arc from -halfAngle to +halfAngle, drawn in XY plane
  // We'll rotate the mesh so Y-up becomes Z-forward
  const segments = 24
  for (let i = 0; i <= segments; i++) {
    const a = -halfAngle + (i / segments) * 2 * halfAngle
    shape.lineTo(Math.sin(a) * radius, Math.cos(a) * radius)
  }
  shape.lineTo(0, 0)
  return shape
}

export function Listener() {
  const groupRef = useRef<import('three').Group>(null)
  const wedgeRef = useRef<import('three').Mesh>(null)
  const wedgeShape = useMemo(() => createWedgeShape(2, 120), [])

  useFrame(() => {
    if (!groupRef.current) return
    const y = useAppStore.getState().listenerY
    groupRef.current.position.y = y
    // Keep wedge on the ground plane regardless of listener height
    if (wedgeRef.current) {
      wedgeRef.current.position.y = -y + 0.01
    }
  })

  return (
    <group ref={groupRef}>
      {/* Facing direction wedge on ground plane */}
      <mesh ref={wedgeRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[wedgeShape]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.12} side={DoubleSide} depthWrite={false} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.15} />
      </mesh>
      {/* Nose cone -- tip points forward along -Z (Web Audio default forward) */}
      <mesh position={[0, 0.25, -0.22]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 0.15, 12]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.3} />
      </mesh>
      {/* Left ear */}
      <mesh position={[-0.2, 0.25, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.1, 8]} />
        <meshStandardMaterial color="#22ddaa" emissive="#22ddaa" emissiveIntensity={0.2} />
      </mesh>
      {/* Right ear */}
      <mesh position={[0.2, 0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.1, 8]} />
        <meshStandardMaterial color="#22ddaa" emissive="#22ddaa" emissiveIntensity={0.2} />
      </mesh>
      {/* Body post */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.2]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.1} />
      </mesh>
    </group>
  )
}
