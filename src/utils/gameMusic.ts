import { getAudioContext } from './sound'

/**
 * Looping chiptune background music for the break games, generated live with
 * WebAudio — melody, bassline, and drums on a lookahead scheduler. No audio
 * assets, no licensing, works offline.
 *
 * Patterns are 4 bars of 8 eighth-note steps. Notes are MIDI numbers.
 */

export type TrackName = 'drop' | 'frenzy'

interface TrackDef {
  bpm: number
  leadType: OscillatorType
  bassType: OscillatorType
  bass: (number | null)[]
  lead: (number | null)[]
  /** Per-bar step indices (0–7). */
  kick: number[]
  snare: number[]
  hat: number[]
}

// Drop Defense: driving A-minor chiptune (Am – F – C – G).
const DROP: TrackDef = {
  bpm: 126,
  leadType: 'square',
  bassType: 'triangle',
  // prettier-ignore
  bass: [
    45, null, 45, null, 57, null, 45, 45,
    41, null, 41, null, 53, null, 41, 41,
    48, null, 48, null, 60, null, 48, 48,
    43, null, 43, null, 55, null, 43, 43,
  ],
  // prettier-ignore
  lead: [
    69, 72, 76, 72, 74, 72, 69, 67,
    65, 69, 72, 69, 77, 76, 72, 69,
    72, 76, 79, 76, 72, 71, 67, 64,
    67, 71, 74, 71, 79, 78, 76, 74,
  ],
  kick: [0, 4],
  snare: [2, 6],
  hat: [1, 3, 5, 7],
}

// Charge Frenzy: bouncy C-major swim (C – Am – F – G), lighter drums.
const FRENZY: TrackDef = {
  bpm: 104,
  leadType: 'triangle',
  bassType: 'triangle',
  // prettier-ignore
  bass: [
    48, null, 48, null, 55, null, 48, null,
    45, null, 45, null, 52, null, 45, null,
    41, null, 41, null, 48, null, 41, null,
    43, null, 43, null, 50, null, 43, null,
  ],
  // prettier-ignore
  lead: [
    72, 74, 76, 79, 76, 74, 72, null,
    69, 72, 74, 76, 74, 72, 69, null,
    65, 69, 72, 74, 72, 69, 67, null,
    67, 71, 74, 79, 74, 71, 69, null,
  ],
  kick: [0],
  snare: [4],
  hat: [2, 6],
}

const TRACKS: Record<TrackName, TrackDef> = { drop: DROP, frenzy: FRENZY }

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12)

let active: { timer: ReturnType<typeof setInterval>; master: GainNode; ac: AudioContext } | null =
  null
let noiseBuf: AudioBuffer | null = null

function getNoise(ac: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.25), ac.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

function tone(
  ac: AudioContext,
  out: AudioNode,
  type: OscillatorType,
  freq: number,
  t: number,
  dur: number,
  vol: number,
) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(gain).connect(out)
  osc.start(t)
  osc.stop(t + dur)
}

function drum(
  ac: AudioContext,
  out: AudioNode,
  kind: 'kick' | 'snare' | 'hat',
  t: number,
) {
  if (kind === 'kick') {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(140, t)
    osc.frequency.exponentialRampToValueAtTime(44, t + 0.11)
    gain.gain.setValueAtTime(0.5, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13)
    osc.connect(gain).connect(out)
    osc.start(t)
    osc.stop(t + 0.13)
    return
  }
  const src = ac.createBufferSource()
  src.buffer = getNoise(ac)
  const filter = ac.createBiquadFilter()
  const gain = ac.createGain()
  if (kind === 'snare') {
    filter.type = 'bandpass'
    filter.frequency.value = 1900
    gain.gain.setValueAtTime(0.16, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
  } else {
    filter.type = 'highpass'
    filter.frequency.value = 7500
    gain.gain.setValueAtTime(0.06, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035)
  }
  src.connect(filter).connect(gain).connect(out)
  src.start(t)
  src.stop(t + 0.1)
}

export function startGameMusic(name: TrackName) {
  stopGameMusic()
  try {
    const ac = getAudioContext()
    void ac.resume()
    const def = TRACKS[name]
    const master = ac.createGain()
    master.gain.value = 0.5
    master.connect(ac.destination)

    const stepDur = 60 / def.bpm / 2 // eighth note
    const steps = def.lead.length
    let step = 0
    let nextTime = ac.currentTime + 0.06

    const timer = setInterval(() => {
      // Schedule slightly ahead so timer jitter never causes gaps.
      while (nextTime < ac.currentTime + 0.15) {
        const i = step % steps
        const barStep = i % 8
        const bass = def.bass[i]
        const lead = def.lead[i]
        if (bass !== null) tone(ac, master, def.bassType, midiHz(bass), nextTime, stepDur * 0.95, 0.17)
        if (lead !== null) tone(ac, master, def.leadType, midiHz(lead), nextTime, stepDur * 0.9, 0.085)
        if (def.kick.includes(barStep)) drum(ac, master, 'kick', nextTime)
        if (def.snare.includes(barStep)) drum(ac, master, 'snare', nextTime)
        if (def.hat.includes(barStep)) drum(ac, master, 'hat', nextTime)
        step++
        nextTime += stepDur
      }
    }, 30)

    active = { timer, master, ac }
  } catch {
    // audio not available; play silently
  }
}

export function stopGameMusic() {
  if (!active) return
  const { timer, master, ac } = active
  active = null
  clearInterval(timer)
  try {
    master.gain.setValueAtTime(master.gain.value, ac.currentTime)
    master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.25)
    setTimeout(() => master.disconnect(), 350)
  } catch {
    master.disconnect()
  }
}
