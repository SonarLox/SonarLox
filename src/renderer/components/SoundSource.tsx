import { useRef } from 'react'
import { DragControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Vector3, type Mesh, type Matrix4 } from 'three'
import { useAppStore } from '../stores/useAppStore'

const _pos = new Vector3()

export function SoundSource() {
  const meshRef = useRef<Mesh>(null)
  const sourcePosition = useAppStore((s) => s.sourcePosition)
  const setSourcePosition = useAppStore((s) => s.setSourcePosition)
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null

  return (
    <DragControls
      autoTransform={false}
      dragLimits={[[-10, 10], [0, 10], [-10, 10]]}
      onDragStart={() => {
        if (controls) controls.enabled = false
      }}
      onDragEnd={() => {
        if (controls) controls.enabled = true
      }}
      onDrag={(localMatrix: Matrix4) => {
        if (!meshRef.current) return
        _pos.setFromMatrixPosition(localMatrix)
        meshRef.current.position.copy(_pos)
        setSourcePosition([_pos.x, _pos.y, _pos.z])
      }}
    >
      <mesh ref={meshRef} position={sourcePosition}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#ff6622" emissive="#ff6622" emissiveIntensity={0.3} />
      </mesh>
    </DragControls>
  )
}
