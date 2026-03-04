import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAppStore } from '../stores/useAppStore'

export function Listener() {
  const groupRef = useRef<import('three').Group>(null)

  useFrame(() => {
    if (!groupRef.current) return
    const y = useAppStore.getState().listenerY
    groupRef.current.position.y = y
  })

  return (
    <group ref={groupRef}>
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
