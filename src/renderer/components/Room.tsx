export function Room() {
  return (
    <mesh position={[0, 5, 0]}>
      <boxGeometry args={[20, 10, 20]} />
      <meshBasicMaterial wireframe transparent opacity={0.3} color="#4466aa" />
    </mesh>
  )
}
