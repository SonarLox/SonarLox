/** Clamps a value between a minimum and maximum */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

/** Throttle interval for position updates (ms) */
export const THROTTLE_MS = 64
