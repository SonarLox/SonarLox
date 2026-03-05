import { useRef, useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { useTransportStore } from '../stores/useTransportStore'
import { audioEngine } from '../audio/WebAudioEngine'
import type { SourceId, EasingType } from '../types'

/**
 * Height of the timeline panel in pixels
 */
const TIMELINE_HEIGHT = 150

/**
 * Width of the header section in pixels
 */
const HEADER_WIDTH = 120

/**
 * Height of each timeline row in pixels
 */
const ROW_HEIGHT = 32

/**
 * Height of each automation lane in pixels
 */
const LANE_HEIGHT = 24

/**
 * Color of the playhead line
 */
const PLAYHEAD_COLOR = '#ff4444'

/**
 * Downsamples an audio buffer to a specified number of points for waveform visualization
 * @param buffer - The audio buffer to downsample
 * @param targetPoints - The number of points to downsample to
 * @returns Array of peak values for visualization
 */
function downsampleBuffer(buffer: AudioBuffer, targetPoints: number): number[] {
  const data = buffer.getChannelData(0)
  const step = Math.max(1, Math.floor(data.length / targetPoints))
  const peaks: number[] = []
  for (let i = 0; i < targetPoints; i++) {
    const start = i * step
    const end = Math.min(start + step, data.length)
    let max = 0
    for (let j = start; j < end; j++) {
      const abs = Math.abs(data[j])
      if (abs > max) max = abs
    }
    peaks.push(max)
  }
  return peaks
}

/**
 * Props for the WaveformRow component
 */
interface WaveformRowProps {
  sourceId: string
  color: string
  duration: number
  totalDuration: number
  width: number
}

/**
 * Renders a waveform visualization for a source in the timeline
 * @param props - Component props
 */
function WaveformRow({ sourceId, color, duration, totalDuration, width }: WaveformRowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const buffer = audioEngine.getAudioBuffer(sourceId)
    if (!buffer) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sourceWidth = totalDuration > 0 ? (duration / totalDuration) * width : width
    canvas.width = width
    canvas.height = ROW_HEIGHT

    ctx.clearRect(0, 0, width, ROW_HEIGHT)

    const targetPoints = Math.min(Math.floor(sourceWidth), 1000)
    if (targetPoints <= 0) return
    const peaks = downsampleBuffer(buffer, targetPoints)

    ctx.fillStyle = color + '66'
    const barWidth = sourceWidth / peaks.length

    for (let i = 0; i < peaks.length; i++) {
      const h = peaks[i] * (ROW_HEIGHT - 4)
      const x = i * barWidth
      const y = (ROW_HEIGHT - h) / 2
      ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), h)
    }
  }, [sourceId, color, duration, totalDuration, width])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: ROW_HEIGHT, display: 'block' }}
    />
  )
}

/**
 * Props for the AutomationLane component
 */
interface AutomationLaneProps {
  sourceId: SourceId
  color: string
  totalDuration: number
  width: number
}

/**
 * Renders an automation lane with keyframes for a source
 * @param props - Component props
 */
function AutomationLane({ sourceId, color, totalDuration, width }: AutomationLaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keyframes = useAppStore((s) => s.animations[sourceId]?.keyframes ?? [])
  const setKeyframe = useAppStore((s) => s.setKeyframe)
  const removeKeyframe = useAppStore((s) => s.removeKeyframe)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; time: number } | null>(null)
  const [selectedEasing, setSelectedEasing] = useState<EasingType>('linear')

  // Draw keyframe diamonds + connecting lines
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width
    canvas.height = LANE_HEIGHT
    ctx.clearRect(0, 0, width, LANE_HEIGHT)

    if (keyframes.length === 0 || totalDuration <= 0) return

    const timeToX = (t: number) => (t / totalDuration) * width
    const midY = LANE_HEIGHT / 2

    // Connecting lines
    ctx.strokeStyle = color + '66'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < keyframes.length; i++) {
      const x = timeToX(keyframes[i].time)
      if (i === 0) ctx.moveTo(x, midY)
      else ctx.lineTo(x, midY)
    }
    ctx.stroke()

    // Diamond markers
    const size = 5
    for (const kf of keyframes) {
      const x = timeToX(kf.time)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(x, midY - size)
      ctx.lineTo(x + size, midY)
      ctx.lineTo(x, midY + size)
      ctx.lineTo(x - size, midY)
      ctx.closePath()
      ctx.fill()
    }
  }, [keyframes, color, totalDuration, width])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (totalDuration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / rect.width) * totalDuration

    // Check if clicking near an existing keyframe (within 6px)
    const timeToX = (t: number) => (t / totalDuration) * rect.width
    for (const kf of keyframes) {
      if (Math.abs(timeToX(kf.time) - x) < 6) return // handled by context menu
    }

    // Add keyframe at current source position
    const source = useAppStore.getState().sources.find((s) => s.id === sourceId)
    if (source) {
      setKeyframe(sourceId, time, source.position)
    }
  }, [sourceId, totalDuration, keyframes, setKeyframe])

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (totalDuration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const timeToX = (t: number) => (t / totalDuration) * rect.width

    // Find nearest keyframe within 8px
    for (const kf of keyframes) {
      if (Math.abs(timeToX(kf.time) - x) < 8) {
        setContextMenu({ x: e.clientX, y: e.clientY, time: kf.time })
        setSelectedEasing(kf.easing)
        return
      }
    }
  }, [totalDuration, keyframes])

  const handleDeleteKeyframe = useCallback(() => {
    if (contextMenu) {
      removeKeyframe(sourceId, contextMenu.time)
      setContextMenu(null)
    }
  }, [sourceId, contextMenu, removeKeyframe])

  const handleEasingChange = useCallback((easing: EasingType) => {
    if (!contextMenu) return
    // Find the keyframe and re-add with new easing
    const kf = keyframes.find((k) => Math.abs(k.time - contextMenu.time) < 0.001)
    if (kf) {
      removeKeyframe(sourceId, kf.time)
      setKeyframe(sourceId, kf.time, kf.position, easing)
    }
    setSelectedEasing(easing)
    setContextMenu(null)
  }, [sourceId, contextMenu, keyframes, removeKeyframe, setKeyframe])

  return (
    <div style={{ position: 'relative', height: LANE_HEIGHT, background: 'var(--bg-deep)' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: LANE_HEIGHT, display: 'block', cursor: 'crosshair' }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />
      {contextMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }}
          />
          <div
            className="kf-context-menu"
            style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 1000 }}
          >
            <button onClick={handleDeleteKeyframe}>Delete</button>
            <div className="kf-context-divider" />
            {(['linear', 'ease-in', 'ease-out', 'ease-in-out'] as EasingType[]).map((e) => (
              <button
                key={e}
                onClick={() => handleEasingChange(e)}
                style={{ fontWeight: e === selectedEasing ? 600 : 400 }}
              >
                {e === selectedEasing ? '> ' : '  '}{e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Timeline panel component for displaying audio sources and their automation
 */
export function TimelinePanel() {
  const sources = useAppStore((s) => s.sources)
  const setSourceMuted = useAppStore((s) => s.setSourceMuted)
  const setSourceSoloed = useAppStore((s) => s.setSourceSoloed)
  const playheadPosition = useTransportStore((s) => s.playheadPosition)
  const duration = useTransportStore((s) => s.duration)
  const seek = useTransportStore((s) => s.seek)

  const animations = useAppStore((s) => s.animations)

  const [expandedLanes, setExpandedLanes] = useState<Set<SourceId>>(new Set())
  const toggleLane = useCallback((id: SourceId) => {
    setExpandedLanes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)
  const trackAreaRef = useRef<HTMLDivElement>(null)

  const getTrackWidth = useCallback(() => {
    if (!trackAreaRef.current) return 400
    return trackAreaRef.current.clientWidth
  }, [])

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (duration <= 0) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const fraction = Math.max(0, Math.min(1, x / rect.width))
      seek(fraction * duration)
    },
    [duration, seek]
  )

  const playheadFraction = duration > 0 ? playheadPosition / duration : 0

  return (
    <div
      ref={containerRef}
      className="panel"
      style={{
        height: TIMELINE_HEIGHT,
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 10,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span>TIMELINE</span>
        <span style={{ marginLeft: 'auto' }}>
          {formatTime(playheadPosition)} / {formatTime(duration)}
        </span>
      </div>

      {/* Track rows */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {sources.map((source) => {
          const buf = audioEngine.getAudioBuffer(source.id)
          const sourceDuration = buf?.duration ?? 0
          const hasKeyframes = (animations[source.id]?.keyframes.length ?? 0) > 0
          const isExpanded = expandedLanes.has(source.id)

          return (
            <div key={source.id}>
              <div
                style={{
                  display: 'flex',
                  height: ROW_HEIGHT,
                  borderBottom: '1px solid var(--border-subtle)',
                  alignItems: 'center',
                }}
              >
                {/* Source label + controls */}
                <div
                  style={{
                    width: HEADER_WIDTH,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '0 6px',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: source.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {source.label}
                  </span>
                  <button
                    className={`btn-icon ${isExpanded ? 'btn-icon--soloed' : ''}`}
                    onClick={() => toggleLane(source.id)}
                    style={{ fontSize: 8, width: 16, height: 16, padding: 0, fontFamily: 'var(--font-mono)' }}
                    title={isExpanded ? 'Hide automation' : `Show automation${hasKeyframes ? ` (${animations[source.id].keyframes.length} kf)` : ''}`}
                  >
                    A
                  </button>
                  <button
                    className={`btn-icon ${source.isMuted ? 'btn-icon--muted' : ''}`}
                    onClick={() => setSourceMuted(source.id, !source.isMuted)}
                    style={{ fontSize: 9, width: 16, height: 16, padding: 0 }}
                    title={source.isMuted ? 'Unmute' : 'Mute'}
                  >
                    M
                  </button>
                  <button
                    className={`btn-icon ${source.isSoloed ? 'btn-icon--soloed' : ''}`}
                    onClick={() => setSourceSoloed(source.id, !source.isSoloed)}
                    style={{ fontSize: 9, width: 16, height: 16, padding: 0 }}
                    title={source.isSoloed ? 'Unsolo' : 'Solo'}
                  >
                    S
                  </button>
                </div>

                {/* Waveform area */}
                <div
                  ref={trackAreaRef}
                  style={{
                    flex: 1,
                    height: '100%',
                    position: 'relative',
                    cursor: 'pointer',
                    background: 'var(--bg-surface)',
                  }}
                  onClick={handleTimelineClick}
                >
                  {sourceDuration > 0 && (
                    <WaveformRow
                      sourceId={source.id}
                      color={source.color}
                      duration={sourceDuration}
                      totalDuration={duration}
                      width={getTrackWidth()}
                    />
                  )}

                  {/* Playhead line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${playheadFraction * 100}%`,
                      width: 1,
                      background: PLAYHEAD_COLOR,
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  />
                </div>
              </div>

              {/* Automation lane */}
              {isExpanded && (
                <div
                  style={{
                    display: 'flex',
                    height: LANE_HEIGHT,
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: HEADER_WIDTH,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 6px',
                    }}
                  >
                    <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
                      POS
                    </span>
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <AutomationLane
                      sourceId={source.id}
                      color={source.color}
                      totalDuration={duration}
                      width={getTrackWidth()}
                    />
                    {/* Playhead line in lane */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${playheadFraction * 100}%`,
                        width: 1,
                        background: PLAYHEAD_COLOR,
                        pointerEvents: 'none',
                        zIndex: 1,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Formats seconds into MM:SS time string
 * @param seconds - Time in seconds to format
 * @returns Formatted time string
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
