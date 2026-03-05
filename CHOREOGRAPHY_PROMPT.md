# Spatial Choreography Engine — Two-Phase Prompt Strategy

## The Split

Opus does **one thing**: psychoacoustic creative design + API specification + implementation briefs.
It never sees the full codebase. It gets only the type signatures it needs.

Qwen3-Coder does **one thing at a time**: implements exactly one primitive per session from
Opus's brief. It never needs to understand the design rationale.

Opus context usage: ~15-20k tokens total (design doc + types in, spec out).
Qwen3-Coder context per task: ~8-12k tokens (one brief + one file).
Cloud tokens spent: Opus session only. Everything after is free.

---

## PHASE 1 — Opus Prompt

Run this in a **fresh claude-opus-4-6 session** with no codebase access.
Paste it exactly. The relevant type context is embedded inline so Opus
doesn't need to read any files.

---

```
You are designing a Spatial Choreography Engine for SonarLox, a 3D spatial audio editor.
Your job is design and specification only. You will NOT write implementation code.
A local model will implement from your spec.

## What already exists (do not redesign these)

The app has a keyframe animation system. Here are the exact types:

```typescript
// Existing types — work within these, do not change them
type SourceId = string
type SourcePosition = [number, number, number]  // [x, y, z] in metres, room coords
type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'

interface Keyframe {
  time: number        // seconds from transport start
  position: SourcePosition
  easing: EasingType
}

interface SourceAnimation {
  sourceId: SourceId
  keyframes: Keyframe[]
}

// AnimationSlice methods available:
// setKeyframe(sourceId, time, position, easing?) — adds/replaces a keyframe
// clearAnimation(sourceId) — removes all keyframes for a source

// Transport info available:
// bpm: number
// duration: number  (seconds, total length of session)
// currentTime: number
```

Room is approximately 20m × 20m × 10m. Listener is at [0, 0, 0] facing -Z.
Positive X = listener's right. Positive Y = up. Negative Z = in front.
Sources are typically placed between 1m and 10m from listener.

## Your task

Design a Spatial Choreography system — a library of named motion behaviours that generate
keyframe arrays procedurally instead of requiring manual keyframe placement.

### Requirements

1. Design **at least 12 motion primitives** grounded in real psychoacoustic principles.
   Each must have:
   - A clear name (snake_case)
   - A stated perceptual effect — what the listener *feels*, not what the source does
   - Musical timing (duration expressed in beats, synced to BPM)
   - A parameter signature (what the user can control)
   - A written algorithm description precise enough that a programmer can implement it
     without creative decisions

2. Cover these emotional registers with at least 2 primitives each:
   - **Tension** — spatial unease, instability, threat
   - **Intimacy** — closeness, warmth, presence
   - **Release** — resolution, arrival, settling
   - **Disorientation** — confusion, loss of grounding
   - **Conversation** — two sources responding to each other spatially
     (these take two sourceIds and generate keyframes for both)

3. Design a **TypeScript API** — types and function signatures only, no implementations:
   - A union type `ChoreographyBehaviour` covering all 12+ primitives
   - A single entry function:
     `generateKeyframes(behaviour: ChoreographyBehaviour, context: ChoreographyContext): GeneratedKeyframes`
   - `ChoreographyContext` must contain: sourceId, startPosition, startTime, bpm, roomBounds
   - `GeneratedKeyframes` must be directly passable to `setKeyframe()` calls

4. Be genuinely creative. Do not produce:
   - Simple circular orbits
   - Random noise movement
   - Generic "move from A to B" primitives
   Think like a spatial audio composer who understands how the ear interprets space.

## Output format

Produce exactly three sections. Nothing else.

---

### SECTION 1: CHOREOGRAPHY.md

A design document with:
- For each primitive: name, perceptual intent, parameter table, algorithm in prose
- The psychoacoustic reasoning for why each primitive produces its stated effect
- A "pairing guide" — which primitives work well together and why
- Notes on what to avoid (common mistakes in spatial motion design)

---

### SECTION 2: TypeScript API Spec

A single TypeScript block containing ONLY:
- All parameter interfaces for each primitive
- The ChoreographyBehaviour union type
- ChoreographyContext interface
- GeneratedKeyframes interface
- The generateKeyframes function signature with JSDoc
- NO implementations, NO function bodies, only signatures and types

---

### SECTION 3: Implementation Briefs

For each primitive, a self-contained brief formatted exactly like this:

---
#### BRIEF: <primitive_name>
**Parameters:** <list from interface>
**Algorithm:**
Step 1: ...
Step 2: ...
Step N: ...
**Edge cases:**
- If duration < 1 beat: ...
- If startPosition is already at target: ...
**Expected output:** Approximately N keyframes over D seconds.
**Verify:** Describe what the generated motion path should look like if visualised.
---

Each brief must be complete enough that a programmer can implement it
with zero creative decisions. All decisions are made here.
```

---

## PHASE 2 — Qwen3-Coder Prompt Template

After Opus produces its output, run one local session per brief.
Replace `[BRIEF CONTENT]` and `[API SPEC]` with the relevant sections from Opus's output.
Never paste the full CHOREOGRAPHY.md — Qwen3-Coder doesn't need it.

Switch to local first:
```bash
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
claude --model qwen3-coder
```

Then paste:

---

```
You are implementing one function in src/renderer/audio/Choreography.ts for the SonarLox
spatial audio editor. Do exactly what the brief says. No creative decisions.

## Existing types (already in the file, do not redefine)

```typescript
type SourceId = string
type SourcePosition = [number, number, number]
type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'

interface Keyframe {
  time: number
  position: SourcePosition
  easing: EasingType
}
```

## The full API types (already declared at top of file, do not redeclare)

[PASTE SECTION 2 FROM OPUS OUTPUT HERE]

## Your task

Implement this one primitive function and append it to Choreography.ts:

[PASTE ONE BRIEF FROM SECTION 3 HERE]

## Rules
- Implement only this one function
- Match the parameter interface exactly as specified
- Add JSDoc with the perceptual intent as the description (copy from brief)
- Do not modify any existing code in the file
- After implementing, run: npm run typecheck
- If typecheck fails, fix until it passes
- Output: DONE or FAILED: <reason>
```

---

## PHASE 3 — useChoreography Hook (single Qwen3-Coder session)

Run this only after all primitives pass typecheck.

```
Implement src/renderer/hooks/useChoreography.ts for SonarLox.

This hook wraps the Choreography.ts generateKeyframes function and connects it
to the Zustand AnimationSlice.

The hook should:
1. Accept a sourceId and a ChoreographyBehaviour
2. Call generateKeyframes with the correct ChoreographyContext
  - Get bpm and duration from useTransportStore
  - Get startPosition from useAppStore source by sourceId
  - roomBounds is always { x: 20, y: 10, z: 20 }
3. Call setKeyframe for each generated keyframe via useAppStore
4. Return: { apply: () => void, isApplying: boolean }

Relevant store access:
  useTransportStore(s => s.bpm)          // number
  useTransportStore(s => s.duration)     // number  
  useAppStore(s => s.sources)            // AudioSource[]
  useAppStore(s => s.setKeyframe)        // (sourceId, time, position, easing) => void

AudioSource has: id: string, position: SourcePosition, label: string

After implementing, run: npm run typecheck
Output: DONE or FAILED: <reason>
```

---

## Execution Order

1. Run Phase 1 (Opus) — save full output to `docs/CHOREOGRAPHY.md` and `CHOREOGRAPHY_SPEC.md`
2. Create empty `src/renderer/audio/Choreography.ts` with just the types from Section 2
3. Run Phase 2 once per primitive brief (12+ local sessions, all free)
4. Run Phase 3 for the hook (one local session)
5. Final typecheck: `npm run typecheck` — should pass clean

## Total cloud cost estimate

| Step | Tokens | Cost |
|---|---|---|
| Phase 1 Opus input (types + prompt) | ~3k | ~$0.05 |
| Phase 1 Opus output (design doc + spec + briefs) | ~8-12k | ~$0.25 |
| **Total** | | **~$0.30** |

Everything in Phase 2 and 3 is free local inference on your 3090.
