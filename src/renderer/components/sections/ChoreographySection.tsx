import { useState, useMemo, useCallback } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useTransportStore } from '../../stores/useTransportStore'
import { useChoreography } from '../../hooks/useChoreography'
import { useToast } from '../ToastContext'
import type { ChoreographyBehaviour } from '../../audio/Choreography'
import type { SourceId, SourcePosition } from '../../types'

// --- Register metadata ---

type Register = 'tension' | 'intimacy' | 'release' | 'disorientation' | 'conversation'

interface PrimitiveInfo {
  type: ChoreographyBehaviour['type']
  label: string
  register: Register
  description: string
  needsSecondary: boolean
}

const PRIMITIVES: PrimitiveInfo[] = [
  { type: 'closing_walls', label: 'Closing Walls', register: 'tension', description: 'Narrowing stereo image, claustrophobic compression', needsSecondary: false },
  { type: 'pendulum_decay', label: 'Pendulum Decay', register: 'tension', description: 'Asymmetric swing with approach, spatial instability', needsSecondary: false },
  { type: 'stalking_shadow', label: 'Stalking Shadow', register: 'tension', description: 'Rear-hemisphere spiral, cone-of-confusion threat', needsSecondary: false },
  { type: 'whisper_approach', label: 'Whisper Approach', register: 'intimacy', description: 'Near-field drift, proximity effect warmth', needsSecondary: false },
  { type: 'breathing_radius', label: 'Breathing Radius', register: 'intimacy', description: 'Rhythmic distance oscillation at breathing rate', needsSecondary: false },
  { type: 'arrival_settle', label: 'Arrival Settle', register: 'release', description: 'Logarithmic spiral convergence to rest', needsSecondary: false },
  { type: 'horizon_drift', label: 'Horizon Drift', register: 'release', description: 'Slow azimuthal glide, meditative calm', needsSecondary: false },
  { type: 'float_descent', label: 'Float Descent', register: 'release', description: 'Vertical settling with gentle lateral sway', needsSecondary: false },
  { type: 'phantom_split', label: 'Phantom Split', register: 'disorientation', description: 'Rapid alternation at precedence-effect boundary', needsSecondary: false },
  { type: 'vertigo_helix', label: 'Vertigo Helix', register: 'disorientation', description: 'Helical path crossing overhead, elevation vertigo', needsSecondary: false },
  { type: 'call_response', label: 'Call & Response', register: 'conversation', description: 'Two sources alternate approach and retreat', needsSecondary: true },
  { type: 'orbit_counterpoint', label: 'Orbit Counterpoint', register: 'conversation', description: 'Counter-rotating orbits with phase offset', needsSecondary: true },
  { type: 'mirror_dance', label: 'Mirror Dance', register: 'conversation', description: 'Median-plane reflection of motion', needsSecondary: true },
]

const REGISTER_META: Record<Register, { label: string; color: string; glow: string }> = {
  tension: { label: 'TENSION', color: '#e84057', glow: 'rgba(232, 64, 87, 0.2)' },
  intimacy: { label: 'INTIMACY', color: '#d4a0e8', glow: 'rgba(212, 160, 232, 0.2)' },
  release: { label: 'RELEASE', color: '#0ea5a0', glow: 'rgba(14, 165, 160, 0.2)' },
  disorientation: { label: 'DISORIENTATION', color: '#e8a027', glow: 'rgba(232, 160, 39, 0.2)' },
  conversation: { label: 'CONVERSATION', color: '#5a9cf5', glow: 'rgba(90, 156, 245, 0.2)' },
}

const REGISTERS: Register[] = ['tension', 'intimacy', 'release', 'disorientation', 'conversation']

// --- Param presets (reasonable defaults, user can tweak durationBeats and keyframesPerBeat) ---

function buildBehaviour(
  type: ChoreographyBehaviour['type'],
  durationBeats: number,
  secondarySourceId?: SourceId,
  secondaryPosition?: SourcePosition,
): ChoreographyBehaviour {
  const base = { durationBeats }
  switch (type) {
    case 'closing_walls': return { type, ...base }
    case 'pendulum_decay': return { type, ...base }
    case 'stalking_shadow': return { type, ...base }
    case 'whisper_approach': return { type, ...base }
    case 'breathing_radius': return { type, ...base }
    case 'arrival_settle': return { type, ...base }
    case 'horizon_drift': return { type, ...base }
    case 'float_descent': return { type, ...base }
    case 'phantom_split': return { type, ...base }
    case 'vertigo_helix': return { type, ...base }
    case 'call_response': return { type, ...base, secondarySourceId: secondarySourceId!, secondaryStartPosition: secondaryPosition! }
    case 'orbit_counterpoint': return { type, ...base, secondarySourceId: secondarySourceId! }
    case 'mirror_dance': return { type, ...base, secondarySourceId: secondarySourceId! }
  }
}

// --- Component ---

export function ChoreographySection() {
  const { showToast } = useToast()
  const { apply } = useChoreography()
  const sources = useAppStore((s) => s.sources)
  const selectedSourceId = useAppStore((s) => s.selectedSourceId)
  const bpm = useAppStore((s) => s.bpm)
  const setBpm = useAppStore((s) => s.setBpm)
  const duration = useTransportStore((s) => s.duration)

  const [activeRegister, setActiveRegister] = useState<Register>('tension')
  const [selectedType, setSelectedType] = useState<ChoreographyBehaviour['type']>('closing_walls')
  const [durationBeats, setDurationBeats] = useState(8)
  const [secondarySourceId, setSecondarySourceId] = useState<SourceId | ''>('')

  const selectedPrimitive = useMemo(
    () => PRIMITIVES.find((p) => p.type === selectedType)!,
    [selectedType],
  )

  const filteredPrimitives = useMemo(
    () => PRIMITIVES.filter((p) => p.register === activeRegister),
    [activeRegister],
  )

  const otherSources = useMemo(
    () => sources.filter((s) => s.id !== selectedSourceId),
    [sources, selectedSourceId],
  )

  const canApply = useMemo(() => {
    if (!selectedSourceId) return false
    if (duration <= 0) return false
    if (selectedPrimitive.needsSecondary && !secondarySourceId) return false
    return true
  }, [selectedSourceId, duration, selectedPrimitive, secondarySourceId])

  const handleApply = useCallback(() => {
    if (!canApply || !selectedSourceId) return

    const secondary = secondarySourceId || undefined
    const secondaryPos = secondary
      ? sources.find((s) => s.id === secondary)?.position
      : undefined

    const behaviour = buildBehaviour(selectedType, durationBeats, secondary, secondaryPos)
    apply(selectedSourceId, behaviour)

    const src = sources.find((s) => s.id === selectedSourceId)
    showToast(`${selectedPrimitive.label} applied to ${src?.label ?? 'source'}`, 'success')
  }, [canApply, selectedSourceId, secondarySourceId, selectedType, durationBeats, sources, apply, showToast, selectedPrimitive])

  const registerMeta = REGISTER_META[activeRegister]

  return (
    <div className="choreo-panel">
      {/* BPM control */}
      <div className="choreo-bpm-row">
        <span className="choreo-bpm-label">BPM</span>
        <input
          type="number"
          className="choreo-bpm-input"
          value={bpm}
          min={1}
          max={999}
          onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
        />
        <div className="choreo-bpm-presets">
          {[80, 120, 140].map((v) => (
            <button
              key={v}
              className={`choreo-bpm-preset ${bpm === v ? 'choreo-bpm-preset--active' : ''}`}
              onClick={() => setBpm(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Register tabs */}
      <div className="choreo-register-strip">
        {REGISTERS.map((r) => {
          const meta = REGISTER_META[r]
          const isActive = r === activeRegister
          return (
            <button
              key={r}
              className={`choreo-register-tab ${isActive ? 'choreo-register-tab--active' : ''}`}
              onClick={() => {
                setActiveRegister(r)
                const first = PRIMITIVES.find((p) => p.register === r)
                if (first) setSelectedType(first.type)
              }}
              style={{
                '--reg-color': meta.color,
                '--reg-glow': meta.glow,
              } as React.CSSProperties}
            >
              <span className="choreo-register-dot" />
              <span className="choreo-register-name">{meta.label}</span>
            </button>
          )
        })}
      </div>

      {/* Primitive selector */}
      <div className="choreo-primitive-grid">
        {filteredPrimitives.map((p) => (
          <button
            key={p.type}
            className={`choreo-primitive-card ${selectedType === p.type ? 'choreo-primitive-card--selected' : ''}`}
            onClick={() => setSelectedType(p.type)}
            style={{
              '--card-color': registerMeta.color,
              '--card-glow': registerMeta.glow,
            } as React.CSSProperties}
          >
            <span className="choreo-primitive-name">{p.label}</span>
            <span className="choreo-primitive-desc">{p.description}</span>
          </button>
        ))}
      </div>

      {/* Parameters */}
      <div className="choreo-params">
        <div className="choreo-param-row">
          <span className="choreo-param-label">Duration</span>
          <div className="choreo-param-control">
            <input
              type="range"
              min={1}
              max={64}
              step={1}
              value={durationBeats}
              onChange={(e) => setDurationBeats(parseInt(e.target.value))}
            />
            <span className="choreo-param-value">{durationBeats} beats</span>
          </div>
        </div>

        {selectedPrimitive.needsSecondary && (
          <div className="choreo-param-row">
            <span className="choreo-param-label">Partner</span>
            <select
              className="choreo-select"
              value={secondarySourceId}
              onChange={(e) => setSecondarySourceId(e.target.value)}
            >
              <option value="">-- select --</option>
              {otherSources.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Apply */}
      <button
        className="choreo-apply-btn"
        disabled={!canApply}
        onClick={handleApply}
        style={{
          '--apply-color': registerMeta.color,
          '--apply-glow': registerMeta.glow,
        } as React.CSSProperties}
      >
        <span className="choreo-apply-icon" />
        Apply {selectedPrimitive.label}
      </button>

      {/* Status hint */}
      {!selectedSourceId && (
        <div className="choreo-hint">Select a source to apply choreography</div>
      )}
      {selectedSourceId && duration <= 0 && (
        <div className="choreo-hint">Load audio first to set duration</div>
      )}
    </div>
  )
}
