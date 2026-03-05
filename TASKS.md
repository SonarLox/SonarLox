# Codebase Audit Tasks

Generated 2026-03-05 by cloud Claude audit pass.

---

### TASK-001: Remove unused imports in ExportDialog.tsx
**Files:** `src/renderer/components/ExportDialog.tsx`
**Instruction:** Remove `useRef` from the React import on line 1 (keep `useState`). Remove `exportBinauralWav` from the Exporter import on line 6 (keep `exportMixedBinauralWav` and `export51Wav`). Remove the unused `progress` state variable and its setter `setExportProgress` on line 23.
**Do not:** Change any export logic or other state variables.
**Verify:** npm run typecheck passes. `npx eslint src/renderer/components/ExportDialog.tsx` shows no warnings.
**Escalate if:** `exportBinauralWav` or `progress`/`setExportProgress` is actually used somewhere in the file.

---

### TASK-002: Remove unused imports in PluginEditor.tsx
**Files:** `src/renderer/components/PluginEditor.tsx`
**Instruction:** Remove `useState` from the React import on line 1 (keep `useCallback`).
**Do not:** Change anything else.
**Verify:** npm run typecheck passes. `npx eslint src/renderer/components/PluginEditor.tsx` shows no warnings.
**Escalate if:** `useState` is actually called somewhere in the file.

---

### TASK-003: Remove unused variables in SourcePropertiesSection.tsx
**Files:** `src/renderer/components/sections/SourcePropertiesSection.tsx`
**Instruction:** Remove the `isPlaying` variable on line 8 (and the `useTransportStore` import on line 2 if it becomes unused). Remove the `isMidiSource` variable on line 19.
**Do not:** Change any other logic or UI rendering.
**Verify:** npm run typecheck passes. `npx eslint src/renderer/components/sections/SourcePropertiesSection.tsx` shows no warnings.
**Escalate if:** `isPlaying` or `isMidiSource` is used in JSX or logic further down in the file.

---

### TASK-004: Remove unused type imports in projectSerializer.ts
**Files:** `src/renderer/audio/projectSerializer.ts`
**Instruction:** On line 1, remove `SourcePosition` and `EasingType` from the type import (keep `AppState`, `AudioSource`, `ProjectManifest`, `SourceId`, `SourceAnimation`).
**Do not:** Change any serialization/deserialization logic.
**Verify:** npm run typecheck passes. `npx eslint src/renderer/audio/projectSerializer.ts` shows no `no-unused-vars` warnings for those types.
**Escalate if:** Either type is used elsewhere in the file.

---

### TASK-005: Remove unused constants in SoundSource.tsx
**Files:** `src/renderer/components/SoundSource.tsx`
**Instruction:** Remove `MIN_BOUNDS` (line 43) and `MAX_BOUNDS` (line 48) constants along with their JSDoc comments. These are defined but never referenced.
**Do not:** Remove the `clamp` function or any other constants. Do not change any component logic.
**Verify:** npm run typecheck passes. `npx eslint src/renderer/components/SoundSource.tsx` shows no `no-unused-vars` warnings for MIN_BOUNDS or MAX_BOUNDS.
**Escalate if:** Either constant is referenced elsewhere in the file.

---

### TASK-006: Remove unused constants in TimelinePanel.tsx
**Files:** `src/renderer/components/TimelinePanel.tsx`
**Instruction:** Remove the `HEADER_WIDTH` constant (line 14) and the `PLAYHEAD_GLOW` constant (line 19). These are defined but never used.
**Do not:** Remove `PLAYHEAD_COLOR` or any other constants. Do not change any rendering logic.
**Verify:** npm run typecheck passes. `npx eslint src/renderer/components/TimelinePanel.tsx` shows no `no-unused-vars` warnings for those constants.
**Escalate if:** Either constant is referenced elsewhere in the file.

---

### TASK-007: Prefix unused catch parameter in App.tsx
**Files:** `src/renderer/App.tsx`
**Instruction:** On line 71, change `catch (err)` to `catch (_err)` to indicate the error parameter is intentionally unused.
**Do not:** Change any other code.
**Verify:** npm run typecheck passes. `npx eslint src/renderer/App.tsx` shows no `no-unused-vars` warning for that catch parameter.
**Escalate if:** `err` is actually used in the catch block.

---

### TASK-008: Remove dead export export51WavSingle in Exporter.ts
**Files:** `src/renderer/audio/Exporter.ts`
**Instruction:** The `export51WavSingle` function (starts at line 264) is exported but never imported anywhere in the codebase. Remove the entire function including its JSDoc comment.
**Do not:** Remove or change any other export functions (`exportBinauralWav`, `exportMixedBinauralWav`, `export51Wav`).
**Verify:** npm run typecheck passes. No other file references `export51WavSingle`.
**Escalate if:** You find an import of `export51WavSingle` anywhere.

---

### TASK-009: Extract shared clamp utility
**Files:** `src/renderer/components/SoundSource.tsx`, `src/renderer/components/VideoScreen.tsx`, new file `src/renderer/utils/math.ts`
**Instruction:** Both SoundSource.tsx (line 53) and VideoScreen.tsx (line 17) define identical `clamp(v, min, max)` functions. Create a new file `src/renderer/utils/math.ts` that exports `clamp`. Then replace the local `clamp` definitions in both component files with `import { clamp } from '../utils/math'`. Also move the duplicate `THROTTLE_MS = 64` constant to the same utils file if both files define it identically (SoundSource line 38, VideoScreen line 15).
**Do not:** Change the clamp logic or any other code in the components.
**Verify:** npm run typecheck passes. Both components still use `clamp` correctly.
**Escalate if:** The clamp implementations differ between files.

---

### TASK-010: Fix `any` types in PluginVisualizers.tsx
**Files:** `src/renderer/components/PluginVisualizers.tsx`
**Instruction:** On line 29, the `VisualizerLayer` props use `instance: any; sources: any[]`. Change to `instance: PluginInstance; sources: AudioSource[]`. Import `PluginInstance` from `'../plugins/types'` and `AudioSource` from `'../types'`.
**Do not:** Change any rendering logic.
**Verify:** npm run typecheck passes. `npx eslint src/renderer/components/PluginVisualizers.tsx` shows no `no-explicit-any` warnings.
**Escalate if:** The types don't match what PluginVisualizers actually receives from its parent.

---

### TASK-011: Fix `any` casts in PluginPanel.tsx
**Files:** `src/renderer/components/PluginPanel.tsx`
**Instruction:** On lines 100 and 104, `target as any` is used. The `target` parameter on line 94 is typed as `string` but should be `SourceId | 'master'`. Change the `handleTargetChange` callback parameter type from `target: string` to `target: SourceId | 'master'`, then remove both `as any` casts. Import `SourceId` from `'../types'` if not already imported.
**Do not:** Change any other callbacks or logic.
**Verify:** npm run typecheck passes. `npx eslint src/renderer/components/PluginPanel.tsx` shows no `no-explicit-any` warnings for those lines.
**Escalate if:** The select element's onChange passes a plain string that can't be typed as `SourceId | 'master'`.

---

### TASK-012: Fix `any` type in PluginParameterDef
**Files:** `src/renderer/plugins/types.ts`
**Instruction:** On line 11, change `defaultValue: any` to `defaultValue: PluginParameterValue`. The `PluginParameterValue` type is already defined on line 19 as `number | boolean | string`.
**Do not:** Change any other type definitions.
**Verify:** npm run typecheck passes.
**Escalate if:** Changing this causes typecheck failures in files that use PluginParameterDef.

---

### TASK-013: Fix `any` in VisualizerData interface
**Files:** `src/renderer/plugins/types.ts`
**Instruction:** On lines 65-66, `geometry: any` and `material: any` should use Three.js types. Change to `geometry: import('three').BufferGeometry` and `material: import('three').Material`. Use inline import types to avoid adding a top-level three import.
**Do not:** Change any other interfaces.
**Verify:** npm run typecheck passes.
**Escalate if:** Three.js types aren't available or the import pattern doesn't work.

---

### TASK-014: Type the startPlayheadLoop parameters
**Files:** `src/renderer/stores/useTransportStore.ts`
**Instruction:** On line 26, `function startPlayheadLoop(set: any, get: any)` uses bare `any`. Type them properly: `set: (partial: Partial<TransportState>) => void` and `get: () => TransportState`. The `TransportState` interface is already defined in the same file.
**Do not:** Change the playhead loop logic.
**Verify:** npm run typecheck passes. `npx eslint src/renderer/stores/useTransportStore.ts` shows no `no-explicit-any` warnings.
**Escalate if:** The Zustand `set`/`get` signatures don't match this typing.

---

### TASK-015: Fix Toast.tsx react-refresh warning
**Files:** `src/renderer/components/Toast.tsx`, new file `src/renderer/components/ToastContext.ts`
**Instruction:** ESLint warns that Toast.tsx exports both components and non-components (the `useToast` hook). Extract the `ToastContext` creation (line 15), the `ToastContextValue` interface, the `ToastType` type, the `Toast` interface, and the `useToast` hook function into a new file `src/renderer/components/ToastContext.ts`. Then import `ToastContext` and types back into Toast.tsx. The `MAX_TOASTS` and `AUTO_DISMISS_MS` constants stay in Toast.tsx (they're only used there). Update all existing `import { useToast } from '../Toast'` or `'./Toast'` references across the codebase to import from `'../ToastContext'` or `'./ToastContext'` respectively.
**Do not:** Change any toast rendering logic or styling.
**Verify:** npm run typecheck passes. `npx eslint src/renderer/components/Toast.tsx` shows no react-refresh warning.
**Escalate if:** More than 5 files import from Toast.tsx (check all imports first).

---

### TASK-016: Type the clonedAnimations in HistorySlice.ts
**Files:** `src/renderer/stores/slices/HistorySlice.ts`
**Instruction:** On line 27, change `Record<string, any>` to `Record<SourceId, SourceAnimation>`. Import `SourceId` and `SourceAnimation` from `'../../types'` if not already imported.
**Do not:** Change the cloning logic.
**Verify:** npm run typecheck passes. `npx eslint src/renderer/stores/slices/HistorySlice.ts` shows no `no-explicit-any` warning for that line.
**Escalate if:** The cloned object structure doesn't match SourceAnimation type.

---

## Summary

16 tasks total. All are mechanical cleanup -- no behavior changes.

**Estimated categories:**
- Unused imports/vars: TASK-001 through TASK-007
- Dead code removal: TASK-008
- Deduplication: TASK-009
- Type safety: TASK-010 through TASK-014, TASK-016
- React-refresh fix: TASK-015
