import { WebAudioSpatialRenderer, type RenderSource } from './SpatialRenderer'
import { createLayout51 } from './SpeakerLayout'
import type { SourceId, SourceAnimation } from '../types'

export type { RenderSource }

const renderer = new WebAudioSpatialRenderer()

export async function exportBinauralWav(
  source: RenderSource,
  listenerY = 0,
  animations?: Record<SourceId, SourceAnimation>,
): Promise<ArrayBuffer> {
  return renderer.renderBinaural([source], { listenerY, animations })
}

export async function exportBinauralFlac(
  source: RenderSource,
  listenerY = 0,
  animations?: Record<SourceId, SourceAnimation>,
): Promise<ArrayBuffer> {
  return renderer.renderBinauralFlac([source], { listenerY, animations })
}

export async function exportMixedBinauralWav(
  sources: RenderSource[],
  listenerY = 0,
  animations?: Record<SourceId, SourceAnimation>,
): Promise<ArrayBuffer> {
  return renderer.renderBinaural(sources, { listenerY, animations })
}

export async function exportMixedBinauralFlac(
  sources: RenderSource[],
  listenerY = 0,
  animations?: Record<SourceId, SourceAnimation>,
): Promise<ArrayBuffer> {
  return renderer.renderBinauralFlac(sources, { listenerY, animations })
}

export async function export51Wav(
  sources: RenderSource[],
  listenerY = 0,
  animations?: Record<SourceId, SourceAnimation>,
): Promise<ArrayBuffer> {
  return renderer.renderMultichannel(sources, createLayout51(), { listenerY, animations })
}

export async function export51Flac(
  sources: RenderSource[],
  listenerY = 0,
  animations?: Record<SourceId, SourceAnimation>,
): Promise<ArrayBuffer> {
  return renderer.renderMultichannelFlac(sources, createLayout51(), { listenerY, animations })
}
