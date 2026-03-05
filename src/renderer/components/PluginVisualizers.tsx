import { useFrame } from '@react-three/fiber'
import { usePluginStore } from '../plugins/usePluginStore'
import { useAppStore } from '../stores/useAppStore'
import { audioEngine } from '../audio/WebAudioEngine'
import { VisualizerPlugin } from '../plugins/types'
import { PluginErrorBoundary } from './PluginErrorBoundary'

export function PluginVisualizers() {
  const activePlugins = usePluginStore((s) => s.activePlugins)
  const sources = useAppStore((s) => s.sources)

  const visualizers = Array.from(activePlugins.values()).filter(
    (p) => p.manifest.type === 'visualizer' && p.enabled
  )

  if (visualizers.length === 0) return null

  return (
    <>
      {visualizers.map((instance) => (
        <PluginErrorBoundary key={instance.manifest.id} pluginName={instance.manifest.name}>
          <VisualizerLayer instance={instance} sources={sources} />
        </PluginErrorBoundary>
      ))}
    </>
  )
}

function VisualizerLayer({ instance, sources }: { instance: any; sources: any[] }) {
  const plugin = instance.plugin as VisualizerPlugin

  useFrame(() => {
    if (typeof plugin.update !== 'function') return
  })

  if (typeof plugin.render === 'function') {
    return (
      <group>
        {plugin.render({ sources, audioEngine })}
      </group>
    )
  }

  return null
}
