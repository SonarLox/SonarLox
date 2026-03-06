import { createPinkNoiseBuffer } from './TestTones'

/**
 * Manages a single audio source channel with spatialization and playback controls.
 */
export class SourceChannel {
  gainNode: GainNode
  pannerNode: PannerNode
  analyserNode: AnalyserNode
  currentSource: AudioBufferSourceNode | OscillatorNode | null = null
  audioBuffer: AudioBuffer | null = null
  playbackStartTime: number = 0
  pauseOffset: number = 0
  isOscillator: boolean = false
  sineFrequency: number = 440
  trimOffset: number = 0
  trimDuration: number | null = null

  constructor(private ctx: AudioContext, masterGain: GainNode) {
    this.gainNode = ctx.createGain()
    this.gainNode.gain.value = 1.0

    this.pannerNode = ctx.createPanner()
    this.pannerNode.panningModel = 'HRTF'
    this.pannerNode.distanceModel = 'inverse'
    this.pannerNode.refDistance = 1
    this.pannerNode.maxDistance = 50
    this.pannerNode.rolloffFactor = 1

    this.analyserNode = ctx.createAnalyser()
    this.analyserNode.fftSize = 2048

    // Chain: gain -> panner -> analyser -> masterGain
    this.gainNode.connect(this.pannerNode)
    this.pannerNode.connect(this.analyserNode)
    this.analyserNode.connect(masterGain)
  }

  /**
   * Starts playback of the audio buffer.
   */
  play(isLooping: boolean, startTime?: number): void {
    if (!this.audioBuffer) return
    this.stopSource()

    const source = this.ctx.createBufferSource()
    source.buffer = this.audioBuffer
    
    // If we have a duration, we need to handle looping manually or via loop points
    if (this.trimDuration !== null) {
      source.loop = isLooping
      source.loopStart = this.trimOffset
      source.loopEnd = this.trimOffset + this.trimDuration
    } else {
      source.loop = isLooping
    }
    
    source.connect(this.gainNode)

    // Current playhead in project time
    const projectTime = this.pauseOffset
    
    // Clip project time to trim duration
    let effectiveOffset = projectTime
    if (this.trimDuration !== null) {
      effectiveOffset = isLooping ? (projectTime % this.trimDuration) : projectTime
      if (effectiveOffset >= this.trimDuration) {
        // Already past the end
        if (!isLooping) return
      }
    }

    // Actual offset in buffer
    const bufferOffset = this.trimOffset + effectiveOffset
    const remainingInBuffer = this.audioBuffer.duration - bufferOffset
    const remainingInTrim = this.trimDuration !== null ? (this.trimDuration - effectiveOffset) : remainingInBuffer
    
    const playDuration = this.trimDuration !== null ? remainingInTrim : undefined

    if (startTime !== undefined) {
      source.start(startTime, bufferOffset, playDuration)
      this.playbackStartTime = startTime - effectiveOffset
    } else {
      source.start(0, bufferOffset, playDuration)
      this.playbackStartTime = this.ctx.currentTime - effectiveOffset
    }
    this.currentSource = source
    this.isOscillator = false

    if (!isLooping) {
      source.onended = () => {
        this.currentSource = null
        this.pauseOffset = 0
      }
    }
  }

  /**
   * Plays a test tone (sine or pink noise) for the source.
   */
  playTestTone(type: 'sine' | 'pink-noise', isLooping: boolean): void {
    this.stop()

    if (type === 'sine') {
      const freq = this.sineFrequency
      const duration = 4
      const sampleRate = this.ctx.sampleRate
      const length = sampleRate * duration
      const sineBuffer = this.ctx.createBuffer(1, length, sampleRate)
      const data = sineBuffer.getChannelData(0)
      for (let i = 0; i < length; i++) {
        data[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate)
      }
      this.audioBuffer = sineBuffer

      const osc = this.ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(this.gainNode)
      osc.start()
      this.currentSource = osc
      this.isOscillator = true
    } else {
      const buffer = createPinkNoiseBuffer(this.ctx)
      this.audioBuffer = buffer
      const source = this.ctx.createBufferSource()
      source.buffer = buffer
      source.loop = isLooping
      source.connect(this.gainNode)
      source.start()
      this.playbackStartTime = this.ctx.currentTime
      this.currentSource = source
      this.isOscillator = false
    }
  }

  /**
   * Pauses playback of the audio source.
   */
  pause(): void {
    if (!this.currentSource) return
    if (!this.isOscillator && this.audioBuffer) {
      const elapsed = this.ctx.currentTime - this.playbackStartTime
      this.pauseOffset = elapsed % this.audioBuffer.duration
    }
    this.stopSource()
  }

  /**
   * Resumes playback of the audio source.
   */
  resume(isLooping: boolean): void {
    this.play(isLooping)
  }

  /**
   * Stops playback of the audio source.
   */
  stop(): void {
    this.stopSource()
    this.pauseOffset = 0
  }

  /**
   * Sets the playhead position for this channel.
   */
  setPlayheadPosition(pos: number, isPlaying: boolean, isLooping: boolean, startTime?: number): void {
    if (!this.audioBuffer) return
    this.pauseOffset = pos % this.audioBuffer.duration
    
    if (isPlaying) {
      this.play(isLooping, startTime)
    }
  }

  /**
   * Internal method to stop and disconnect the current audio source.
   */
  private stopSource(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch {
        // Already stopped
      }
      this.currentSource.disconnect()
      this.currentSource = null
    }
  }

  /**
   * Sets whether the audio source loops.
   */
  setLooping(loop: boolean): void {
    if (
      this.currentSource &&
      !this.isOscillator &&
      this.currentSource instanceof AudioBufferSourceNode
    ) {
      this.currentSource.loop = loop
    }
  }

  /**
   * Sets the frequency of the sine oscillator.
   */
  setSineFrequency(freq: number): void {
    this.sineFrequency = freq
    if (this.isOscillator && this.currentSource instanceof OscillatorNode) {
      this.currentSource.frequency.value = freq
    }
    if (this.isOscillator) {
      const duration = 4
      const sampleRate = this.ctx.sampleRate
      const length = sampleRate * duration
      const sineBuffer = this.ctx.createBuffer(1, length, sampleRate)
      const data = sineBuffer.getChannelData(0)
      for (let i = 0; i < length; i++) {
        data[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate)
      }
      this.audioBuffer = sineBuffer
    }
  }

  /**
   * Checks if the audio source is currently paused.
   */
  isPaused(): boolean {
    return this.pauseOffset > 0 && this.currentSource === null
  }

  /**
   * Sets the trim (offset and duration) for this source.
   */
  setTrim(offset: number, duration: number | null): void {
    this.trimOffset = offset
    this.trimDuration = duration
  }

  /**
   * Sets the 3D position of the audio source.
   */
  setPosition(x: number, y: number, z: number): void {
    this.pannerNode.positionX.value = x
    this.pannerNode.positionY.value = y
    this.pannerNode.positionZ.value = z
  }

  /**
   * Sets the volume of the audio source.
   */
  setVolume(volume: number): void {
    this.gainNode.gain.value = volume
  }

  /**
   * Disposes of the audio resources for this channel.
   */
  dispose(): void {
    this.stop()
    this.gainNode.disconnect()
    this.pannerNode.disconnect()
    this.analyserNode.disconnect()
  }
}
