export function Room() {
  /**
   * Renders a 3D room mesh that serves as the spatial audio environment boundary.
   * This wireframe room represents the confined space where audio sources are positioned
   * and spatialized using HRTF binaural rendering techniques.
   * The room dimensions are 20x10x20 units with a blue transparent wireframe material.
   */
  return (
    <mesh position={[0, 5, 0]}>
      <boxGeometry args={[20, 10, 20]} />
      <meshBasicMaterial wireframe transparent opacity={0.3} color="#4466aa" />
    </mesh>
  )
}
