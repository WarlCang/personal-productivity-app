import { useEffect, useRef, useState } from 'react'
import { Gamepad2, Lock, Play, Timer } from 'lucide-react'
import { useStore, useGameUnlocked } from '../../store/useStore'
import { playGameSound } from '../../utils/sound'

const W = 480
const H = 600
const PADDLE_H = 26

interface Phone {
  x: number
  y: number
  vy: number
  golden: boolean
  rotation: number
  vr: number
}

interface GameState {
  paddleX: number
  paddleW: number
  phones: Phone[]
  score: number
  lives: number
  elapsed: number
  spawnIn: number
  keys: { left: boolean; right: boolean }
  flash: number
}

function newGame(): GameState {
  return {
    paddleX: W / 2,
    paddleW: 110,
    phones: [],
    score: 0,
    lives: 3,
    elapsed: 0,
    spawnIn: 0.5,
    keys: { left: false, right: false },
    flash: 0,
  }
}

function drawPhone(ctx: CanvasRenderingContext2D, p: Phone) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  const w = 26
  const h = 50
  ctx.fillStyle = p.golden ? '#ffc04d' : '#2a2a30'
  ctx.strokeStyle = p.golden ? '#ff9440' : '#4a4a52'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, 6)
  ctx.fill()
  ctx.stroke()
  // screen
  ctx.fillStyle = p.golden ? '#fff3d6' : '#15151a'
  ctx.beginPath()
  ctx.roundRect(-w / 2 + 3, -h / 2 + 6, w - 6, h - 14, 3)
  ctx.fill()
  // camera dot
  ctx.fillStyle = p.golden ? '#ff9440' : '#5a5a64'
  ctx.beginPath()
  ctx.arc(0, -h / 2 + 3.5, 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawPaddle(ctx: CanvasRenderingContext2D, s: GameState) {
  const x = s.paddleX - s.paddleW / 2
  const y = H - 46
  // TORRAS case: orange shell with inner lining
  ctx.fillStyle = '#ff7a1a'
  ctx.beginPath()
  ctx.roundRect(x, y, s.paddleW, PADDLE_H, 10)
  ctx.fill()
  ctx.fillStyle = '#0a0a0b'
  ctx.beginPath()
  ctx.roundRect(x + 5, y + 5, s.paddleW - 10, PADDLE_H - 10, 6)
  ctx.fill()
  ctx.fillStyle = '#ff7a1a'
  ctx.font = 'bold 9px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('TORRAS', s.paddleX, y + PADDLE_H / 2 + 3)
}

export default function GameView() {
  const unlocked = useGameUnlocked()
  const phase = useStore((s) => s.phase)
  const secondsLeft = useStore((s) => s.secondsLeft)
  const highScore = useStore((s) => s.gameHighScore)
  const setGameHighScore = useStore((s) => s.setGameHighScore)
  const setView = useStore((s) => s.setView)
  const startPomodoro = useStore((s) => s.startPomodoro)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState>(newGame())
  const [status, setStatus] = useState<'idle' | 'playing' | 'over'>('idle')
  const [finalScore, setFinalScore] = useState(0)
  const statusRef = useRef(status)
  statusRef.current = status

  // End the run if the break ends while playing.
  useEffect(() => {
    if (!unlocked && statusRef.current === 'playing') endGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked])

  const endGame = () => {
    const s = stateRef.current
    setFinalScore(s.score)
    setGameHighScore(s.score)
    setStatus('over')
    playGameSound('over')
  }

  const start = () => {
    stateRef.current = newGame()
    setStatus('playing')
  }

  useEffect(() => {
    if (status !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()

    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') stateRef.current.keys.left = down
      if (e.key === 'ArrowRight' || e.key === 'd') stateRef.current.keys.right = down
      if (down && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) e.preventDefault()
    }
    const keyDown = onKey(true)
    const keyUp = onKey(false)
    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scale = W / rect.width
      stateRef.current.paddleX = (e.clientX - rect.left) * scale
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    canvas.addEventListener('mousemove', onMouse)

    const loop = (now: number) => {
      const s = stateRef.current
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      s.elapsed += dt

      // Difficulty ramps with time.
      const speed = 1 + s.elapsed / 25
      if (s.keys.left) s.paddleX -= 420 * dt
      if (s.keys.right) s.paddleX += 420 * dt
      s.paddleX = Math.max(s.paddleW / 2, Math.min(W - s.paddleW / 2, s.paddleX))

      s.spawnIn -= dt
      if (s.spawnIn <= 0) {
        s.spawnIn = Math.max(0.35, 1.1 - s.elapsed / 60)
        s.phones.push({
          x: 30 + Math.random() * (W - 60),
          y: -30,
          vy: (140 + Math.random() * 80) * speed,
          golden: Math.random() < 0.12,
          rotation: (Math.random() - 0.5) * 0.6,
          vr: (Math.random() - 0.5) * 2,
        })
      }

      const paddleTop = H - 46
      for (const p of s.phones) {
        p.y += p.vy * dt
        p.rotation += p.vr * dt
      }
      const surviving: Phone[] = []
      for (const p of s.phones) {
        const caught =
          p.y + 25 >= paddleTop && p.y + 25 <= paddleTop + PADDLE_H + 14 && Math.abs(p.x - s.paddleX) < s.paddleW / 2 + 10
        if (caught) {
          s.score += p.golden ? 50 : 10
          playGameSound('catch')
          continue
        }
        if (p.y - 25 > H) {
          s.lives -= 1
          s.flash = 0.3
          playGameSound('miss')
          continue
        }
        surviving.push(p)
      }
      s.phones = surviving
      s.flash = Math.max(0, s.flash - dt)

      // Render
      ctx.fillStyle = '#0a0a0b'
      ctx.fillRect(0, 0, W, H)
      if (s.flash > 0) {
        ctx.fillStyle = `rgba(239,68,68,${s.flash * 0.5})`
        ctx.fillRect(0, 0, W, H)
      }
      // subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (const p of s.phones) drawPhone(ctx, p)
      drawPaddle(ctx, s)

      ctx.fillStyle = '#e8e8ec'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`${s.score}`, 16, 30)
      ctx.textAlign = 'right'
      ctx.fillText('❤'.repeat(Math.max(0, s.lives)), W - 16, 30)

      if (s.lives <= 0) {
        endGame()
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      canvas.removeEventListener('mousemove', onMouse)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  if (!unlocked) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-700 bg-ink-900">
          <Lock size={26} className="text-ink-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Drop Defense is locked</h1>
        <p className="max-w-sm text-sm leading-relaxed text-ink-400">
          The game unlocks during pomodoro breaks. Finish a focus session and come back here to defend some phones —
          you've earned it.
        </p>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => { startPomodoro(); setView('pomodoro') }}>
            <Timer size={15} /> Start a focus session
          </button>
        </div>
        {highScore > 0 && <p className="text-xs text-ink-500">High score: {highScore}</p>}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center px-6 py-8">
      <div className="flex w-full max-w-[480px] items-baseline justify-between">
        <h1 className="text-2xl font-bold text-white">Drop Defense</h1>
        <div className="text-xs text-ink-400">
          Break ends in <span className="font-mono text-emerald-400">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</span>
          {' · '}High score <span className="text-brand-400">{highScore}</span>
        </div>
      </div>
      <p className="mt-1 w-full max-w-[480px] text-xs text-ink-400">
        Phones are falling — catch them in your TORRAS case! Mouse or ←/→ to move. Golden phones are worth 50.
      </p>

      <div className="relative mt-4">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="rounded-xl border border-ink-700 bg-ink-950 [image-rendering:auto]"
          style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 180px)' }}
        />
        {status !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70 backdrop-blur-sm">
            <Gamepad2 size={36} className="text-brand-500" />
            {status === 'over' ? (
              <>
                <div className="text-2xl font-bold text-white">{phase === 'focus' ? "Break's over!" : 'Game over'}</div>
                <div className="text-sm text-ink-300">
                  Score: <span className="font-semibold text-brand-400">{finalScore}</span>
                  {finalScore >= highScore && finalScore > 0 && ' · New high score! 🏆'}
                </div>
              </>
            ) : (
              <div className="text-lg font-semibold text-white">Ready to defend?</div>
            )}
            {unlocked && (
              <button className="btn-primary" onClick={start}>
                <Play size={15} /> {status === 'over' ? 'Play again' : 'Start'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
