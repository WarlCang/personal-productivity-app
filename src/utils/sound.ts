let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

/** Shared context so game music and effects mix in one place. */
export function getAudioContext(): AudioContext {
  return getCtx()
}

/** Short two-tone chime used when a pomodoro phase ends. */
export function playChime() {
  try {
    const ac = getCtx()
    const now = ac.currentTime
    ;[880, 1320].forEach((freq, i) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      osc.connect(gain).connect(ac.destination)
      osc.start(t)
      osc.stop(t + 0.5)
    })
  } catch {
    // audio not available; ignore
  }
}

export function playGameSound(kind: 'catch' | 'miss' | 'over') {
  try {
    const ac = getCtx()
    const now = ac.currentTime
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    if (kind === 'catch') {
      osc.type = 'square'
      osc.frequency.setValueAtTime(660, now)
      osc.frequency.exponentialRampToValueAtTime(990, now + 0.08)
    } else if (kind === 'miss') {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, now)
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.25)
    } else {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(330, now)
      osc.frequency.exponentialRampToValueAtTime(82, now + 0.6)
    }
    const dur = kind === 'over' ? 0.6 : 0.2
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur)
    osc.connect(gain).connect(ac.destination)
    osc.start(now)
    osc.stop(now + dur)
  } catch {
    // audio not available; ignore
  }
}
