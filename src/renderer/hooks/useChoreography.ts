import { useCallback } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { useTransportStore } from '../stores/useTransportStore'
import type { SourceId } from '../types'
import {
  generateKeyframes,
  type ChoreographyBehaviour,
  type ChoreographyContext,
  type RoomBounds,
} from '../audio/Choreography'

/**
 * Hook bridging the Choreography engine to the Zustand stores.
 * Builds context from current state, generates keyframes, and records them
 * as a single undoable operation.
 */
export function useChoreography() {
  const apply = useCallback((sourceId: SourceId, behaviour: ChoreographyBehaviour) => {
    const appState = useAppStore.getState()
    const transport = useTransportStore.getState()

    const source = appState.sources.find((s) => s.id === sourceId)
    if (!source) return

    const roomBounds: RoomBounds = {
      x: appState.roomSize[0] / 2,
      y: 10,
      z: appState.roomSize[1] / 2,
    }

    const context: ChoreographyContext = {
      sourceId,
      startPosition: source.position,
      startTime: transport.playheadPosition,
      bpm: appState.bpm,
      duration: transport.duration,
      roomBounds,
    }

    const result = generateKeyframes(behaviour, context)

    // Record history for single undo step
    appState.recordHistory(`Apply choreography: ${behaviour.type}`)

    // Bypass quantization for choreography keyframes (times are already precise)
    const prevQuantize = useAppStore.getState().recordQuantize
    useAppStore.getState().setRecordQuantize(0)

    // Apply primary keyframes
    for (const kf of result.primary.keyframes) {
      useAppStore.getState().setKeyframe(result.primary.sourceId, kf.time, kf.position, kf.easing)
    }

    // Apply secondary keyframes (conversation primitives)
    if (result.secondary) {
      for (const kf of result.secondary.keyframes) {
        useAppStore.getState().setKeyframe(result.secondary.sourceId, kf.time, kf.position, kf.easing)
      }
    }

    // Restore quantization setting
    useAppStore.getState().setRecordQuantize(prevQuantize)
  }, [])

  return { apply }
}
