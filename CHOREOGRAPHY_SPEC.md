# Spatial Choreography Engine -- TypeScript API Spec

Types-only specification for the choreography system. See `docs/CHOREOGRAPHY.md` for design rationale.

```typescript
import type { SourceId, SourcePosition, EasingType, Keyframe } from '../types'

// --- Room Bounds ---

interface RoomBounds {
  x: number  // half-width (room extends from -x to +x)
  y: number  // max height
  z: number  // half-depth (room extends from -z to +z)
}

// --- Context ---

interface ChoreographyContext {
  sourceId: SourceId
  startPosition: SourcePosition
  startTime: number       // seconds from transport start
  bpm: number
  duration: number        // total session duration in seconds
  roomBounds: RoomBounds
}

// --- Generated Output ---

interface GeneratedKeyframes {
  primary: {
    sourceId: SourceId
    keyframes: Keyframe[]
  }
  secondary?: {
    sourceId: SourceId
    keyframes: Keyframe[]
  }
}

// --- Behaviour Parameter Interfaces ---

interface ClosingWallsParams {
  type: 'closing_walls'
  durationBeats: number
  startRadius: number
  endRadius: number
  startAngle: number
  endAngle: number
  keyframesPerBeat: number
}

interface PendulumDecayParams {
  type: 'pendulum_decay'
  durationBeats: number
  swingAngle: number
  startDistance: number
  endDistance: number
  decayFactor: number
  keyframesPerBeat: number
}

interface StalkingShadowParams {
  type: 'stalking_shadow'
  durationBeats: number
  radius: number
  startAngle: number
  sweepRange: number
  verticalAmplitude: number
  spiralTightening: number
  keyframesPerBeat: number
}

interface WhisperApproachParams {
  type: 'whisper_approach'
  durationBeats: number
  startDistance: number
  endDistance: number
  approachAngle: number
  verticalDrift: number
  keyframesPerBeat: number
}

interface BreathingRadiusParams {
  type: 'breathing_radius'
  durationBeats: number
  centreDistance: number
  amplitude: number
  breathsPerMinute: number
  azimuth: number
  keyframesPerBeat: number
}

interface ArrivalSettleParams {
  type: 'arrival_settle'
  durationBeats: number
  targetPosition: SourcePosition
  initialRadius: number
  spiralRevolutions: number
  keyframesPerBeat: number
}

interface HorizonDriftParams {
  type: 'horizon_drift'
  durationBeats: number
  distance: number
  startAngle: number
  endAngle: number
  height: number
  keyframesPerBeat: number
}

interface FloatDescentParams {
  type: 'float_descent'
  durationBeats: number
  startHeight: number
  endHeight: number
  lateralSway: number
  swayFrequency: number
  distance: number
  azimuth: number
  keyframesPerBeat: number
}

interface PhantomSplitParams {
  type: 'phantom_split'
  durationBeats: number
  positionA: SourcePosition
  positionB: SourcePosition
  alternationRate: number
  blend: number
}

interface VertigoHelixParams {
  type: 'vertigo_helix'
  durationBeats: number
  radius: number
  revolutions: number
  startHeight: number
  endHeight: number
  tiltDegrees: number
  keyframesPerBeat: number
}

interface CallResponseParams {
  type: 'call_response'
  durationBeats: number
  turnBeats: number
  approachDistance: number
  retreatDistance: number
  secondarySourceId: SourceId
  secondaryStartPosition: SourcePosition
  keyframesPerBeat: number
}

interface OrbitCounterpointParams {
  type: 'orbit_counterpoint'
  durationBeats: number
  radius: number
  phaseOffset: number
  revolutions: number
  height: number
  secondarySourceId: SourceId
  keyframesPerBeat: number
}

interface MirrorDanceParams {
  type: 'mirror_dance'
  durationBeats: number
  pathType: 'arc' | 'figure8'
  radius: number
  height: number
  secondarySourceId: SourceId
  keyframesPerBeat: number
}

// --- Discriminated Union ---

type ChoreographyBehaviour =
  | ClosingWallsParams
  | PendulumDecayParams
  | StalkingShadowParams
  | WhisperApproachParams
  | BreathingRadiusParams
  | ArrivalSettleParams
  | HorizonDriftParams
  | FloatDescentParams
  | PhantomSplitParams
  | VertigoHelixParams
  | CallResponseParams
  | OrbitCounterpointParams
  | MirrorDanceParams

/**
 * Generate keyframe arrays from a named choreography behaviour.
 * Pure function -- no side effects, no store access.
 *
 * @param behaviour - The motion primitive and its parameters
 * @param context - Source position, timing, and room information
 * @returns Primary keyframes (always), and optional secondary keyframes for conversation primitives
 */
declare function generateKeyframes(
  behaviour: ChoreographyBehaviour,
  context: ChoreographyContext,
): GeneratedKeyframes
```
