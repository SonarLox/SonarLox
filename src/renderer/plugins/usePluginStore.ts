import { create } from 'zustand'
import type { SourceId } from '../types'
import type { PluginManifest, PluginInstance, PluginParameterValue } from './types'

interface PluginStoreState {
  availablePlugins: PluginManifest[]
  activePlugins: Map<string, PluginInstance>
  isScanning: boolean
  
  setAvailablePlugins: (plugins: PluginManifest[]) => void
  setIsScanning: (isScanning: boolean) => void
  activatePlugin: (instance: PluginInstance) => void
  deactivatePlugin: (pluginId: string) => void
  togglePlugin: (pluginId: string) => void
  setPluginParameter: (pluginId: string, paramId: string, value: PluginParameterValue) => void
  setPluginTarget: (pluginId: string, target: SourceId | 'master') => void
  
  getEffectsForSource: (sourceId: SourceId) => PluginInstance[]
  getMasterEffects: () => PluginInstance[]
  getExporterPlugins: () => PluginInstance[]
}

export const usePluginStore = create<PluginStoreState>((set, get) => ({
  availablePlugins: [],
  activePlugins: new Map(),
  isScanning: false,

  setAvailablePlugins: (availablePlugins) => set({ availablePlugins }),
  setIsScanning: (isScanning) => set({ isScanning }),

  activatePlugin: (instance) => {
    set((state) => {
      const next = new Map(state.activePlugins)
      next.set(instance.manifest.id, instance)
      return { activePlugins: next }
    })
  },

  deactivatePlugin: (pluginId) => {
    set((state) => {
      const next = new Map(state.activePlugins)
      next.delete(pluginId)
      return { activePlugins: next }
    })
  },

  togglePlugin: (pluginId) => {
    set((state) => {
      const next = new Map(state.activePlugins)
      const instance = next.get(pluginId)
      if (instance) {
        instance.enabled = !instance.enabled
      }
      return { activePlugins: next }
    })
  },

  setPluginParameter: (pluginId, paramId, value) => {
    const { activePlugins } = get()
    const instance = activePlugins.get(pluginId)
    if (instance) {
      instance.parameters[paramId] = value
      instance.plugin.setParameter(paramId, value)
      set({ activePlugins: new Map(activePlugins) })
    }
  },

  setPluginTarget: (pluginId, target) => {
    const { activePlugins } = get()
    const instance = activePlugins.get(pluginId)
    if (instance) {
      instance.target = target
      set({ activePlugins: new Map(activePlugins) })
    }
  },

  getEffectsForSource: (sourceId) => {
    const { activePlugins } = get()
    const effects: PluginInstance[] = []
    for (const instance of activePlugins.values()) {
      if (
        instance.manifest.type === 'audio-effect' &&
        instance.target === sourceId &&
        instance.enabled
      ) {
        effects.push(instance)
      }
    }
    return effects.sort((a, b) => a.slot - b.slot)
  },

  getMasterEffects: () => {
    const { activePlugins } = get()
    const effects: PluginInstance[] = []
    for (const instance of activePlugins.values()) {
      if (
        instance.manifest.type === 'audio-effect' &&
        instance.target === 'master' &&
        instance.enabled
      ) {
        effects.push(instance)
      }
    }
    return effects.sort((a, b) => a.slot - b.slot)
  },

  getExporterPlugins: () => {
    const { activePlugins } = get()
    return Array.from(activePlugins.values()).filter(
      (instance) => instance.manifest.type === 'exporter' && instance.enabled
    )
  },
}))
