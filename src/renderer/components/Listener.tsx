const AXIS_RADIUS = 0.02
const AXIS_LENGTH = 0.6

function Axis({ rotation }: { rotation: [number, number, number] }) {
  return (
    <mesh rotation={rotation}>
      <cylinderGeometry args={[AXIS_RADIUS, AXIS_RADIUS, AXIS_LENGTH]} />
      <meshBasicMaterial color="#00ff88" />
    </mesh>
  )
}

export function Listener() {
  return (
    <group position={[0, 0, 0]}>
      <Axis rotation={[0, 0, 0]} />
      <Axis rotation={[0, 0, Math.PI / 2]} />
      <Axis rotation={[Math.PI / 2, 0, 0]} />
      <mesh>
        <sphereGeometry args={[0.08]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
    </group>
  )
}
