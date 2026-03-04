import { useState } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { audioEngine } from '../audio/AudioEngine'
import { exportBinauralWav } from '../audio/Exporter'

export function ControlPanel() {
  const sourcePosition = useAppStore((s) => s.sourcePosition)
  const isPlaying = useAppStore((s) => s.isPlaying)
  const audioFileName = useAppStore((s) => s.audioFileName)
  const setIsPlaying = useAppStore((s) => s.setIsPlaying)
  const volume = useAppStore((s) => s.volume)
  const setVolume = useAppStore((s) => s.setVolume)
  const isLooping = useAppStore((s) => s.isLooping)
  const setIsLooping = useAppStore((s) => s.setIsLooping)
  const listenerY = useAppStore((s) => s.listenerY)
  const setListenerY = useAppStore((s) => s.setListenerY)
  const setAudioFileName = useAppStore((s) => s.setAudioFileName)
  const sineFrequency = useAppStore((s) => s.sineFrequency)
  const setSineFrequency = useAppStore((s) => s.setSineFrequency)
  const cameraPresets = useAppStore((s) => s.cameraPresets)
  const setCameraCommand = useAppStore((s) => s.setCameraCommand)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    const buffer = audioEngine.getAudioBuffer()
    if (!buffer) return
    setIsExporting(true)
    try {
      const wav = await exportBinauralWav(buffer, sourcePosition, volume)
      await window.api.saveWavFile(wav)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleLoadAudio = async () => {
    try {
      if (!window.api) {
        console.error('window.api is not defined — preload may not have run')
        return
      }
      const result = await window.api.openAudioFile()
      if (!result) return
      await audioEngine.loadFile(result.buffer)
      setAudioFileName(result.name ?? 'audio file')
    } catch (err) {
      console.error('Failed to load audio:', err)
    }
  }

  const handlePlay = () => {
    if (audioEngine.isPaused()) {
      audioEngine.resume()
    } else {
      audioEngine.play()
    }
    setIsPlaying(true)
  }

  const handlePause = () => {
    audioEngine.pause()
    setIsPlaying(false)
  }

  const handleStop = () => {
    audioEngine.stop()
    setIsPlaying(false)
  }

  const handleTestTone = async (type: 'sine' | 'pink-noise') => {
    await audioEngine.playTestTone(type)
    setIsPlaying(true)
    setAudioFileName(type === 'sine' ? `Sine ${Math.round(sineFrequency)} Hz` : 'Pink Noise')
  }

  const freqFromSlider = (v: number) => 20 * Math.pow(200, v)
  const sliderFromFreq = (f: number) => Math.log(f / 20) / Math.log(200)

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const freq = Math.round(freqFromSlider(parseFloat(e.target.value)))
    setSineFrequency(freq)
    audioEngine.setSineFrequency(freq)
    if (isPlaying && audioFileName?.startsWith('Sine')) {
      setAudioFileName(`Sine ${freq} Hz`)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    audioEngine.setVolume(v)
  }

  const handleLoopToggle = () => {
    const next = !isLooping
    setIsLooping(next)
    audioEngine.setLooping(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>SonarLox</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>Source</label>
        <button onClick={handleLoadAudio} style={btnStyle}>
          Load Audio
        </button>
        {audioFileName && (
          <span style={{ fontSize: 12, opacity: 0.7 }}>{audioFileName}</span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>Test Tones</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => handleTestTone('sine')} style={btnStyle}>
            Sine
          </button>
          <button onClick={() => handleTestTone('pink-noise')} style={btnStyle}>
            Pink Noise
          </button>
        </div>
        <label style={{ fontSize: 11, opacity: 0.5 }}>
          Sine — {Math.round(sineFrequency)} Hz
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={sliderFromFreq(sineFrequency)}
          onChange={handleFrequencyChange}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>Transport</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handlePlay} disabled={!audioFileName || isPlaying} style={btnStyle}>
            Play
          </button>
          <button onClick={handlePause} disabled={!isPlaying} style={btnStyle}>
            Pause
          </button>
          <button onClick={handleStop} disabled={!isPlaying && !audioEngine.isPaused()} style={btnStyle}>
            Stop
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>
          Volume — {Math.round(volume * 100)}%
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={handleVolumeChange}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>Loop</label>
        <button onClick={handleLoopToggle} style={{
          ...btnStyle,
          background: isLooping ? '#2a2a4e' : '#1a1a2e',
          borderColor: isLooping ? '#6a6aff' : '#444'
        }}>
          {isLooping ? 'Loop: On' : 'Loop: Off'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>
          Listener Height — {listenerY.toFixed(1)}
        </label>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={listenerY}
          onChange={(e) => setListenerY(parseFloat(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>Export</label>
        <button
          onClick={handleExport}
          disabled={!audioFileName || isExporting}
          style={btnStyle}
        >
          {isExporting ? 'Exporting...' : 'Export WAV'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>Camera</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setCameraCommand({ type: 'home' })} style={btnStyle}>
            Home
          </button>
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              onClick={(e) => {
                if (e.shiftKey) {
                  setCameraCommand({ type: 'save', index: i })
                } else if (cameraPresets[i]) {
                  setCameraCommand({ type: 'recall', index: i })
                }
              }}
              style={{
                ...btnStyle,
                minWidth: 36,
                background: cameraPresets[i] ? '#2a2a4e' : '#1a1a2e',
                borderColor: cameraPresets[i] ? '#6a6aff' : '#444'
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 10, opacity: 0.35 }}>Shift+click to save</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>Position</label>
        <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
          X: {sourcePosition[0].toFixed(2)}{' '}
          Y: {sourcePosition[1].toFixed(2)}{' '}
          Z: {sourcePosition[2].toFixed(2)}
        </div>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  background: '#1a1a2e',
  border: '1px solid #444',
  borderRadius: 4,
  color: '#e0e0e0',
  cursor: 'pointer',
  fontSize: 13
}
