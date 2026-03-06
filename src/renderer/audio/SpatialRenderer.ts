import type { SourceId, SourcePosition, SourceAnimation } from '../types'
import type { SpeakerLayout } from './SpeakerLayout'
import { encodeWav } from './encodeWav'
import { encodeFlac } from './encodeFlac'
import { getAnimatedPosition, getAnimatedPositionsAtIntervals } from './AnimationEngine'
import { computeVBAPGains } from './SpeakerLayout'

export interface RenderSource {
  sourceId: SourceId
  audioBuffer: AudioBuffer
  position: SourcePosition
  volume: number
}

export interface RenderOptions {
  sampleRate?: number
  listenerY?: number
  animations?: Record<SourceId, SourceAnimation>
  onProgress?: (fraction: number) => void
  abortSignal?: AbortSignal
}

export interface SpatialRenderer {
  renderBinaural(sources: RenderSource[], options?: RenderOptions): Promise<ArrayBuffer>
  renderMultichannel(sources: RenderSource[], layout: SpeakerLayout, options?: RenderOptions): Promise<ArrayBuffer>
  renderBinauralFlac(sources: RenderSource[], options?: RenderOptions): Promise<ArrayBuffer>
  renderMultichannelFlac(sources: RenderSource[], layout: SpeakerLayout, options?: RenderOptions): Promise<ArrayBuffer>
  computeFrame(sources: RenderSource[], layout: SpeakerLayout, time: number, options?: Pick<RenderOptions, 'listenerY' | 'animations'>): Map<SourceId, Float32Array>
}

const SCHEDULE_INTERVAL_MS = 20

function resolvePositionAtTime(
  sourceId: SourceId,
  time: number,
  animations: Record<SourceId, SourceAnimation> | undefined,
  fallbackPosition: SourcePosition,
): SourcePosition {
  if (!animations) return fallbackPosition
  return getAnimatedPosition(sourceId, time, animations, fallbackPosition)
}

function schedulePositionAutomation(
  pannerNode: PannerNode,
  sourceId: SourceId,
  animations: Record<SourceId, SourceAnimation>,
  position: SourcePosition,
  duration: number,
): void {
  const anim = animations[sourceId]
  if (!anim || anim.keyframes.length === 0) return

  const samples = getAnimatedPositionsAtIntervals(
    sourceId, duration, animations, position, SCHEDULE_INTERVAL_MS / 1000
  )
  for (const s of samples) {
    pannerNode.positionX.setValueAtTime(s.position[0], s.time)
    pannerNode.positionY.setValueAtTime(s.position[1], s.time)
    pannerNode.positionZ.setValueAtTime(s.position[2], s.time)
  }
}

function scheduleMultichannelGainAutomation(
  gainNodes: GainNode[],
  sourceId: SourceId,
  animations: Record<SourceId, SourceAnimation>,
  position: SourcePosition,
  volume: number,
  listenerY: number,
  duration: number,
  layout: SpeakerLayout,
): void {
  const anim = animations[sourceId]
  if (!anim || anim.keyframes.length === 0) return

  const samples = getAnimatedPositionsAtIntervals(
    sourceId, duration, animations, position, SCHEDULE_INTERVAL_MS / 1000
  )
  for (const s of samples) {
    const adjusted: SourcePosition = [s.position[0], s.position[1] - listenerY, s.position[2]]
    const gains = computeVBAPGains(adjusted, layout)
    for (let ch = 0; ch < layout.channelCount; ch++) {
      gainNodes[ch].gain.setValueAtTime(volume * gains[ch], s.time)
    }
  }
}

export class WebAudioSpatialRenderer implements SpatialRenderer {
  private async renderToBuffer(
    sources: RenderSource[],
    numChannels: number,
    options?: RenderOptions,
    setup?: (offlineCtx: OfflineAudioContext) => void,
    onSource?: (offlineCtx: OfflineAudioContext, src: RenderSource, dest: AudioNode) => void
  ): Promise<AudioBuffer> {
    const sampleRate = options?.sampleRate ?? 44100
    const onProgress = options?.onProgress
    const abortSignal = options?.abortSignal

    if (abortSignal?.aborted) throw new DOMException('Render aborted', 'AbortError')
    if (sources.length === 0) throw new Error('No sources to render')

    const maxDuration = Math.max(...sources.map((s) => s.audioBuffer.duration))
    const length = Math.ceil(maxDuration * sampleRate)
    const offlineCtx = new OfflineAudioContext(numChannels, length, sampleRate)

    setup?.(offlineCtx)
    onProgress?.(0)

    for (const src of sources) {
      onSource?.(offlineCtx, src, offlineCtx.destination)
    }

    const rendered = await offlineCtx.startRendering()
    onProgress?.(1)
    return rendered
  }

  async renderBinaural(sources: RenderSource[], options?: RenderOptions): Promise<ArrayBuffer> {
    const buffer = await this.renderToBuffer(sources, 2, options, 
      (ctx) => { ctx.listener.positionY.value = options?.listenerY ?? 0 },
      (ctx, src, dest) => {
        const source = ctx.createBufferSource()
        source.buffer = src.audioBuffer
        const gainNode = ctx.createGain()
        gainNode.gain.value = src.volume
        const pannerNode = ctx.createPanner()
        pannerNode.panningModel = 'HRTF'
        pannerNode.positionX.value = src.position[0]
        pannerNode.positionY.value = src.position[1]
        pannerNode.positionZ.value = src.position[2]
        if (src.sourceId && options?.animations) {
          schedulePositionAutomation(pannerNode, src.sourceId, options.animations, src.position, src.audioBuffer.duration)
        }
        source.connect(gainNode)
        gainNode.connect(pannerNode)
        pannerNode.connect(dest)
        source.start()
      }
    )
    return encodeWav(buffer)
  }

  async renderBinauralFlac(sources: RenderSource[], options?: RenderOptions): Promise<ArrayBuffer> {
    const buffer = await this.renderToBuffer(sources, 2, options, 
      (ctx) => { ctx.listener.positionY.value = options?.listenerY ?? 0 },
      (ctx, src, dest) => {
        const source = ctx.createBufferSource()
        source.buffer = src.audioBuffer
        const gainNode = ctx.createGain()
        gainNode.gain.value = src.volume
        const pannerNode = ctx.createPanner()
        pannerNode.panningModel = 'HRTF'
        pannerNode.positionX.value = src.position[0]
        pannerNode.positionY.value = src.position[1]
        pannerNode.positionZ.value = src.position[2]
        if (src.sourceId && options?.animations) {
          schedulePositionAutomation(pannerNode, src.sourceId, options.animations, src.position, src.audioBuffer.duration)
        }
        source.connect(gainNode)
        gainNode.connect(pannerNode)
        pannerNode.connect(dest)
        source.start()
      }
    )
    return encodeFlac(buffer)
  }

  async renderMultichannel(sources: RenderSource[], layout: SpeakerLayout, options?: RenderOptions): Promise<ArrayBuffer> {
    const buffer = await this.renderToBuffer(sources, layout.channelCount, options, undefined,
      (ctx, src, dest) => {
        const merger = ctx.createChannelMerger(layout.channelCount)
        merger.connect(dest)
        const adjustedPosition: SourcePosition = [src.position[0], src.position[1] - (options?.listenerY ?? 0), src.position[2]]
        const initialGains = computeVBAPGains(adjustedPosition, layout)
        const gainNodes: GainNode[] = []
        for (let ch = 0; ch < layout.channelCount; ch++) {
          const sourceBuffer = ctx.createBufferSource()
          sourceBuffer.buffer = src.audioBuffer
          const gainNode = ctx.createGain()
          gainNode.gain.value = src.volume * initialGains[ch]
          gainNodes.push(gainNode)
          const isLFE = layout.speakers.find(s => s.channelIndex === ch)?.isLFE ?? false
          if (isLFE) {
            const lpf = ctx.createBiquadFilter()
            lpf.type = 'lowpass'
            lpf.frequency.value = layout.lfeCrossoverHz ?? 120
            sourceBuffer.connect(gainNode)
            gainNode.connect(lpf)
            lpf.connect(merger, 0, ch)
          } else {
            sourceBuffer.connect(gainNode)
            gainNode.connect(merger, 0, ch)
          }
          sourceBuffer.start()
        }
        if (src.sourceId && options?.animations) {
          scheduleMultichannelGainAutomation(gainNodes, src.sourceId, options.animations, src.position, src.volume, options.listenerY ?? 0, src.audioBuffer.duration, layout)
        }
      }
    )
    return encodeWav(buffer)
  }

  async renderMultichannelFlac(sources: RenderSource[], layout: SpeakerLayout, options?: RenderOptions): Promise<ArrayBuffer> {
    const buffer = await this.renderToBuffer(sources, layout.channelCount, options, undefined,
      (ctx, src, dest) => {
        const merger = ctx.createChannelMerger(layout.channelCount)
        merger.connect(dest)
        const adjustedPosition: SourcePosition = [src.position[0], src.position[1] - (options?.listenerY ?? 0), src.position[2]]
        const initialGains = computeVBAPGains(adjustedPosition, layout)
        const gainNodes: GainNode[] = []
        for (let ch = 0; ch < layout.channelCount; ch++) {
          const sourceBuffer = ctx.createBufferSource()
          sourceBuffer.buffer = src.audioBuffer
          const gainNode = ctx.createGain()
          gainNode.gain.value = src.volume * initialGains[ch]
          gainNodes.push(gainNode)
          const isLFE = layout.speakers.find(s => s.channelIndex === ch)?.isLFE ?? false
          if (isLFE) {
            const lpf = ctx.createBiquadFilter()
            lpf.type = 'lowpass'
            lpf.frequency.value = layout.lfeCrossoverHz ?? 120
            sourceBuffer.connect(gainNode)
            gainNode.connect(lpf)
            lpf.connect(merger, 0, ch)
          } else {
            sourceBuffer.connect(gainNode)
            gainNode.connect(merger, 0, ch)
          }
          sourceBuffer.start()
        }
        if (src.sourceId && options?.animations) {
          scheduleMultichannelGainAutomation(gainNodes, src.sourceId, options.animations, src.position, src.volume, options.listenerY ?? 0, src.audioBuffer.duration, layout)
        }
      }
    )
    return encodeFlac(buffer)
  }

  computeFrame(
    sources: RenderSource[],
    layout: SpeakerLayout,
    time: number,
    options?: Pick<RenderOptions, 'listenerY' | 'animations'>,
  ): Map<SourceId, Float32Array> {
    const listenerY = options?.listenerY ?? 0
    const animations = options?.animations
    const frameGains = new Map<SourceId, Float32Array>()

    for (const src of sources) {
      const resolved = resolvePositionAtTime(src.sourceId, time, animations, src.position)
      const adjusted: SourcePosition = [
        resolved[0],
        resolved[1] - listenerY,
        resolved[2],
      ]
      frameGains.set(src.sourceId, computeVBAPGains(adjusted, layout))
    }

    return frameGains
  }
}
