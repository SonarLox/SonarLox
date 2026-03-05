# Spatial Choreography Engine -- Psychoacoustic Design Document

## Overview

The Spatial Choreography Engine generates keyframe arrays from named motion behaviours grounded in psychoacoustic principles. Instead of manually placing keyframes, users select a behaviour ("make this source feel threatening") and the engine produces the motion path automatically.

All primitives are pure functions. They receive a context (source position, timing, room bounds) and return keyframe arrays. No side effects, no store access.

## Coordinate System

- Listener at origin [0, 0, 0] facing -Z
- Positive X = listener's right
- Positive Y = up
- Negative Z = in front of listener
- Room: ~20m x 10m x 20m (x, y, z)
- Sources typically 1-10m from listener

## Registers

### Tension

Spatial unease, instability, threat. Exploits the auditory system's sensitivity to sounds approaching from behind, asymmetric motion, and narrowing spatial envelopes.

### Intimacy

Closeness, warmth, presence. Leverages near-field distance cues (proximity effect, ILD dominance) and breathing-rate rhythms that entrain with the listener's autonomic nervous system.

### Release

Resolution, arrival, settling. Uses deceleration curves and convergence patterns that signal safety to the auditory system.

### Disorientation

Confusion, loss of spatial grounding. Exploits cone-of-confusion ambiguity, precedence effect boundaries, and elevation uncertainty.

### Conversation

Two sources responding to each other spatially. Creates social presence through alternating approach/retreat, counter-rotation, and mirrored motion.

---

## Primitives

### 1. closing_walls (Tension)

**Perceptual effect:** Narrowing stereo image creating claustrophobic compression. The auditory scene collapses inward.

**Psychoacoustic basis:** Reducing the angular separation between a source and centre compresses the perceived auditory width. When combined with approach (decreasing distance), ILD and ITD differences shrink, making the sound feel like it is pressing in on the listener.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 8 | Total duration in beats |
| startRadius | number | 8 | Initial distance from listener |
| endRadius | number | 1.5 | Final distance from listener |
| startAngle | number | 90 | Initial azimuth offset in degrees (mirrored both sides) |
| endAngle | number | 10 | Final azimuth offset in degrees |
| keyframesPerBeat | number | 2 | Temporal resolution |

**Algorithm:** Generate keyframes along a path that simultaneously reduces radius and narrows azimuth. Use ease-in curve so compression accelerates (most unsettling at the end). Azimuth is measured from -Z axis; positions placed symmetrically but the source follows one side. Height stays at startPosition.y.

### 2. pendulum_decay (Tension)

**Perceptual effect:** Asymmetric swing with approach creates spatial instability. Like a pendulum swinging closer with each pass.

**Psychoacoustic basis:** Asymmetric lateral motion prevents the listener from predicting the next position. Combined with decreasing distance, each swing arrives closer and more lateralised, creating escalating tension.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 16 | Total duration in beats |
| swingAngle | number | 120 | Peak-to-peak azimuth swing in degrees |
| startDistance | number | 8 | Starting radius |
| endDistance | number | 2 | Ending radius |
| decayFactor | number | 0.85 | Swing amplitude decay per half-cycle |
| keyframesPerBeat | number | 2 | Temporal resolution |

**Algorithm:** Each half-cycle, the source swings from one side to the other at decreasing amplitude (multiplied by decayFactor each half-cycle). Simultaneously, the radius decreases linearly. Use sinusoidal azimuth interpolation within each half-cycle. Height constant.

### 3. stalking_shadow (Tension)

**Perceptual effect:** Rear-hemisphere spiral exploiting cone-of-confusion uncertainty. A presence that circles behind you, never quite localizable.

**Psychoacoustic basis:** The cone of confusion creates ambiguity for sources behind and above. A slow spiral in the rear hemisphere exploits this -- the listener senses presence but cannot pin it down, triggering threat detection.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 16 | Total duration in beats |
| radius | number | 4 | Spiral radius from listener |
| startAngle | number | 120 | Starting azimuth (degrees, 180 = directly behind) |
| sweepRange | number | 120 | Angular range to sweep (centred on 180 degrees) |
| verticalAmplitude | number | 2 | Height oscillation amplitude |
| spiralTightening | number | 0.7 | Radius multiplier over duration (< 1 = approaches) |
| keyframesPerBeat | number | 2 | Temporal resolution |

**Algorithm:** Sweep azimuth back and forth within [180 - sweepRange/2, 180 + sweepRange/2] using sinusoidal motion. Simultaneously oscillate height between startPosition.y and startPosition.y + verticalAmplitude at a different frequency (1.5x the azimuth frequency for Lissajous-like complexity). Radius decreases from `radius` to `radius * spiralTightening` linearly.

### 4. whisper_approach (Intimacy)

**Perceptual effect:** Near-field drift triggers proximity effect warmth. A voice leaning in to whisper.

**Psychoacoustic basis:** Below ~0.5m, strong ILD differences and head shadow create hyper-intimate spatial impression. The slow approach from conversational distance (1-2m) to whisper distance (~0.3m) triggers the proximity effect and associated warmth/trust response.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 8 | Total duration in beats |
| startDistance | number | 2.5 | Starting distance |
| endDistance | number | 0.3 | Final whisper distance |
| approachAngle | number | -30 | Azimuth angle in degrees (negative = left, like leaning in) |
| verticalDrift | number | 0.1 | Gentle vertical sway amplitude |
| keyframesPerBeat | number | 2 | Temporal resolution |

**Algorithm:** Logarithmic approach (fast at first, slowing as it nears -- like a real person leaning in). Convert distance to position at fixed azimuth angle. Add subtle sinusoidal vertical drift. Use ease-out easing.

### 5. breathing_radius (Intimacy)

**Perceptual effect:** Rhythmic distance oscillation at breathing rate. Creates feeling of shared breath, co-presence.

**Psychoacoustic basis:** Normal breathing rate (12-20 cycles/min) entrains the listener's autonomic nervous system. Distance oscillation at this rate modulates proximity cues rhythmically, creating a sense of living, breathing presence.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 16 | Total duration in beats |
| centreDistance | number | 1.5 | Mean distance from listener |
| amplitude | number | 0.5 | Distance oscillation amplitude |
| breathsPerMinute | number | 15 | Breathing rate |
| azimuth | number | 0 | Fixed azimuth angle in degrees |
| keyframesPerBeat | number | 2 | Temporal resolution |

**Algorithm:** Sinusoidal oscillation of distance at breathsPerMinute rate, centred at centreDistance with given amplitude. Convert polar (distance, azimuth) to Cartesian at each keyframe. Height = startPosition.y with micro-sway (0.03m amplitude at 2x breath rate).

### 6. arrival_settle (Release)

**Perceptual effect:** Logarithmic spiral convergence to a rest position. The satisfying feeling of something finding its place.

**Psychoacoustic basis:** Deceleration in the auditory scene signals resolution. A spiral that tightens logarithmically mimics natural settling (a ball rolling to a stop) and triggers the release of spatial attention.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 8 | Total duration in beats |
| targetPosition | SourcePosition | [0,1,-3] | Where the source comes to rest |
| initialRadius | number | 6 | Starting orbital radius from target |
| spiralRevolutions | number | 2.5 | Number of complete revolutions |
| keyframesPerBeat | number | 2 | Temporal resolution |

**Algorithm:** Logarithmic spiral from initialRadius down to 0, completing spiralRevolutions revolutions. Radius at time t = initialRadius * (1 - t/duration)^2 (quadratic falloff for visible deceleration). Final keyframe placed exactly at targetPosition. Height interpolates linearly from startPosition.y to targetPosition.y.

### 7. horizon_drift (Release)

**Perceptual effect:** Slow azimuthal glide at constant distance. Meditative, spacious, like watching clouds.

**Psychoacoustic basis:** Constant-distance lateral motion at slow rates (< 15 deg/sec) creates smooth ITD/ILD transitions that the auditory system tracks without effort. This effortless tracking is experienced as calm.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 16 | Total duration in beats |
| distance | number | 6 | Fixed distance from listener |
| startAngle | number | -60 | Starting azimuth in degrees |
| endAngle | number | 60 | Ending azimuth in degrees |
| height | number | 1 | Y position |
| keyframesPerBeat | number | 1 | Temporal resolution |

**Algorithm:** Linear azimuth interpolation from startAngle to endAngle at constant distance. Convert to Cartesian. Use ease-in-out easing for gentle acceleration/deceleration at endpoints.

### 8. float_descent (Release)

**Perceptual effect:** Vertical settling with gentle lateral sway. Like a feather drifting down.

**Psychoacoustic basis:** Vertical localization cues (pinna filtering) change subtly with elevation. A slow descent combined with gentle lateral sway creates a dreamy, weightless quality that resolves as the source settles.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 12 | Total duration in beats |
| startHeight | number | 5 | Starting Y position |
| endHeight | number | 1 | Ending Y position |
| lateralSway | number | 1.5 | Amplitude of side-to-side sway |
| swayFrequency | number | 2 | Number of sway cycles over duration |
| distance | number | 4 | Distance from listener (XZ plane) |
| azimuth | number | 0 | Base azimuth angle in degrees |
| keyframesPerBeat | number | 2 | Temporal resolution |

**Algorithm:** Height decreases from startHeight to endHeight using ease-out curve (fast initial drop, gentle settling). Lateral position oscillates sinusoidally at swayFrequency cycles, amplitude decreasing linearly to zero at end. Base XZ position from distance and azimuth.

### 9. phantom_split (Disorientation)

**Perceptual effect:** Rapid position alternation at the boundary of the precedence effect. Source appears to split into phantom images.

**Psychoacoustic basis:** The precedence effect (Haas effect) fuses sounds arriving within ~5-40ms. By alternating positions at the edge of this window, the auditory system cannot form a stable fused image, creating phantom source perception.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 4 | Total duration in beats |
| positionA | SourcePosition | [-3,1,-2] | First alternation position |
| positionB | SourcePosition | [3,1,-2] | Second alternation position |
| alternationRate | number | 8 | Alternations per beat |
| blend | number | 0 | 0 = hard switch, 1 = smooth crossfade |

**Algorithm:** At alternationRate per beat, switch between positionA and positionB. When blend > 0, interpolate between positions over blend fraction of each cycle. Easing is linear for hard switches, ease-in-out for blended. Clamp positions to room bounds.

### 10. vertigo_helix (Disorientation)

**Perceptual effect:** Helical path crossing overhead, creating unstable elevation cues and spatial vertigo.

**Psychoacoustic basis:** Elevation perception relies on pinna spectral cues which are less precise than azimuth cues. A helical path that crosses overhead and behind the listener creates rapid transitions through poorly-resolved elevation angles, destabilizing spatial perception.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 8 | Total duration in beats |
| radius | number | 3 | Helix radius |
| revolutions | number | 3 | Number of complete revolutions |
| startHeight | number | 0 | Starting Y position |
| endHeight | number | 6 | Peak Y position |
| tiltDegrees | number | 30 | Tilt angle of helix axis from vertical |
| keyframesPerBeat | number | 4 | High resolution for fast motion |

**Algorithm:** Helical path: angle increases linearly over duration, radius is constant. Height follows a raised cosine (rises to peak at midpoint, returns to start). Tilt the helix axis by tiltDegrees from vertical toward -Z. Convert cylindrical coordinates (angle, radius, height) to Cartesian, applying the tilt rotation matrix.

### 11. call_response (Conversation)

**Perceptual effect:** Two sources alternate approach and retreat, like a spoken dialogue where speakers lean in when talking.

**Psychoacoustic basis:** In real conversation, speakers naturally modulate distance (leaning in for emphasis, back for listening). Alternating this pattern between two sources creates social presence and turn-taking dynamics.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 16 | Total duration in beats |
| turnBeats | number | 4 | Duration of each "turn" in beats |
| approachDistance | number | 1.5 | Distance when "speaking" |
| retreatDistance | number | 4 | Distance when "listening" |
| secondarySourceId | SourceId | (required) | The other source in the conversation |
| secondaryStartPosition | SourcePosition | (required) | Starting position of secondary source |
| keyframesPerBeat | number | 2 | Temporal resolution |

**Algorithm:** Divide duration into turns of turnBeats length. On odd turns, primary approaches while secondary retreats; on even turns, reverse. Approach/retreat follows ease-in-out easing. Each source maintains its own azimuth angle (derived from its start position). Returns both primary and secondary keyframe sets.

### 12. orbit_counterpoint (Conversation)

**Perceptual effect:** Counter-rotating orbits with phase offset. Two sources in spatial counterpoint, like dancers.

**Psychoacoustic basis:** Counter-rotation creates constantly changing angular separation between two sources. The auditory system tracks both streams, and their relative motion creates a spatial rhythm independent of the audio content.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 16 | Total duration in beats |
| radius | number | 4 | Orbit radius |
| phaseOffset | number | 180 | Initial angular offset between sources (degrees) |
| revolutions | number | 2 | Number of complete revolutions |
| height | number | 1 | Y position for both sources |
| secondarySourceId | SourceId | (required) | The other source |
| keyframesPerBeat | number | 2 | Temporal resolution |

**Algorithm:** Primary source orbits clockwise (increasing angle from its start azimuth). Secondary orbits counter-clockwise from its start azimuth offset by phaseOffset degrees. Both at constant radius and height. Linear easing for constant velocity.

### 13. mirror_dance (Conversation)

**Perceptual effect:** Median-plane reflection of motion. One source leads, the other mirrors across the median plane, creating symmetric spatial imagery.

**Psychoacoustic basis:** The median plane (front-back, up-down) is the axis of bilateral symmetry in auditory perception. Mirrored motion across this plane creates a strong sense of spatial correspondence -- the listener perceives two distinct sources as a unified pair.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| durationBeats | number | 8 | Total duration in beats |
| pathType | 'arc' or 'figure8' | 'arc' | Shape of the primary source's path |
| radius | number | 4 | Path radius/amplitude |
| height | number | 1 | Y position |
| secondarySourceId | SourceId | (required) | The mirrored source |
| keyframesPerBeat | number | 2 | Temporal resolution |

**Algorithm:** Generate a path for the primary source (arc: semicircular sweep; figure8: lemniscate in XZ plane). Mirror each keyframe position across the median plane (negate X coordinate). Both sources use the same easing. Returns primary and secondary keyframe sets.

---

## Pairing Guide

### Tension Building
- `closing_walls` + `stalking_shadow`: One source compresses from the front while another circles behind. Dual-threat spatial anxiety.
- `pendulum_decay` + `breathing_radius` (at fast rate): Asymmetric swing against steady pulsing creates rhythmic tension.

### Tension to Release
- `closing_walls` -> `arrival_settle`: Compression resolving into convergence. Use on the same source across sections.
- `pendulum_decay` -> `float_descent`: Swinging instability resolving into gentle settling.

### Intimate Dialogue
- `whisper_approach` + `call_response`: One source approaches intimately while two others converse. Creates an eavesdropping scenario.
- `breathing_radius` on two sources at different rates: Creates polyrhythmic spatial breathing.

### Spatial Counterpoint
- `orbit_counterpoint` + `horizon_drift`: Two sources in counterpoint against a slow-drifting third. Rich spatial texture without chaos.
- `mirror_dance` + `vertigo_helix`: Symmetric pair grounding a disorienting third. Controlled chaos.

### Disorientation
- `phantom_split` + `vertigo_helix`: Phantom imaging while another source spirals overhead. Maximum spatial confusion.
- `stalking_shadow` + `phantom_split`: Rear-hemisphere threat with frontal phantom images. Nowhere feels safe.

## Common Mistakes to Avoid

1. **Too-fast motion**: Sources moving faster than ~30 degrees/second lose spatial definition. The auditory system cannot track rapid motion and the effect becomes noise rather than motion.

2. **Ignoring the vertical**: Elevation cues are weaker than azimuth cues. Don't rely solely on height changes for perceptual effect -- always combine with lateral motion.

3. **Symmetric tension**: Real threat is asymmetric. Perfectly circular orbits or symmetric oscillations feel mechanical, not threatening. Use asymmetric parameters for tension primitives.

4. **Distance below 0.2m**: At very close range, HRTF models break down and artefacts appear. Keep minimum distance at 0.2-0.3m.

5. **Ignoring room bounds**: Sources outside the room produce no meaningful spatial cues. Always clamp to room bounds.

6. **Overusing disorientation**: Constant spatial confusion fatigues the listener quickly. Use disorientation primitives in short bursts (2-4 beats) surrounded by stable positioning.
