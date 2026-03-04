import { Viewport } from './components/Viewport'
import { ControlPanel } from './components/ControlPanel'

export default function App() {
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <div style={{ flex: 1 }}>
        <Viewport />
      </div>
      <div style={{ width: 280, background: '#16213e', padding: 16 }}>
        <ControlPanel />
      </div>
    </div>
  )
}
