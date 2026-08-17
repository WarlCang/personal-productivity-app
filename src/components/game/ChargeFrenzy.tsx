import { useEffect, useRef, useState } from 'react'
import { Gamepad2, Play } from 'lucide-react'
import { useStore, useGameUnlocked } from '../../store/useStore'
import { useT } from '../../i18n'
import { playGameSound } from '../../utils/sound'
import { startGameMusic, stopGameMusic } from '../../utils/gameMusic'

/**
 * Charge Frenzy — feeding-frenzy style: you are a TORRAS power bank. Charge
 * (eat) gadgets smaller than you to grow; touching a bigger one costs a life.
 */

const W = 520
const H = 460

const TIERS = [
  { r: 9, pts: 10 }, // earbud
  { r: 15, pts: 25 }, // watch
  { r: 23, pts: 50 }, // phone
  { r: 33, pts: 100 }, // tablet
  { r: 45, pts: 200 }, // laptop
  { r: 60, pts: 0 }, // monitor — the shark: always bigger than you
] as const

const START_R = 16
const MAX_R = 54

interface Gadget {
  x: number
  baseY: number
  y: number
  vx: number
  tier: number
  r: number
  bob: number
  bobPhase: number
}

interface FrenzyState {
  x: number
  y: number
  r: number
  level: number
  levelFlash: number
  targetX: number
  targetY: number
  facing: 1 | -1
  keys: { left: boolean; right: boolean; up: boolean; down: boolean }
  gadgets: Gadget[]
  score: number
  lives: number
  inv: number
  flash: number
  elapsed: number
  spawnIn: number
}

function newGame(): FrenzyState {
  return {
    x: W / 2,
    y: H / 2,
    r: START_R,
    level: 1,
    levelFlash: 0,
    targetX: W / 2,
    targetY: H / 2,
    facing: 1,
    keys: { left: false, right: false, up: false, down: false },
    gadgets: [],
    score: 0,
    lives: 3,
    inv: 0,
    flash: 0,
    elapsed: 0,
    spawnIn: 0.4,
  }
}

function spawnGadget(s: FrenzyState): Gadget {
  // Mostly bite-sized prey, with genuine predators mixed in more as you grow.
  const playerTier = TIERS.findIndex((t) => s.r < t.r)
  const ceiling = playerTier === -1 ? TIERS.length : Math.min(TIERS.length, playerTier + 2)
  const weights = TIERS.map((_, i) =>
    i === TIERS.length - 1 ? 0.35 : i < ceiling ? (i <= playerTier ? 4 : 2) : 0.5,
  )
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = Math.random() * total
  let tier = 0
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]
    if (roll <= 0) {
      tier = i
      break
    }
  }
  const fromLeft = Math.random() < 0.5
  const speed = (50 + Math.random() * 70) * (1 + s.elapsed / 90) * (1 + (s.level - 1) * 0.15)
  const baseY = 40 + Math.random() * (H - 80)
  return {
    x: fromLeft ? -50 : W + 50,
    baseY,
    y: baseY,
    vx: fromLeft ? speed : -speed,
    tier,
    r: TIERS[tier].r,
    bob: 4 + Math.random() * 9,
    bobPhase: Math.random() * Math.PI * 2,
  }
}

function drawGadget(ctx: CanvasRenderingContext2D, g: Gadget) {
  ctx.save()
  ctx.translate(g.x, g.y)
  if (g.vx < 0) ctx.scale(-1, 1)
  const body = '#2a2a30'
  const edge = '#4a4a52'
  const screen = '#3d4f66'
  ctx.lineWidth = 2
  if (g.tier === 0) {
    // earbud
    ctx.fillStyle = '#e8e8ec'
    ctx.beginPath()
    ctx.arc(0, -2, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(-2.5, 0, 5, 9)
  } else if (g.tier === 1) {
    // watch
    ctx.fillStyle = edge
    ctx.fillRect(-6, -14, 12, 28)
    ctx.fillStyle = body
    ctx.strokeStyle = edge
    ctx.beginPath()
    ctx.roundRect(-10, -10, 20, 20, 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = screen
    ctx.beginPath()
    ctx.roundRect(-6.5, -6.5, 13, 13, 4)
    ctx.fill()
  } else if (g.tier === 2) {
    // phone
    ctx.fillStyle = body
    ctx.strokeStyle = edge
    ctx.beginPath()
    ctx.roundRect(-12, -21, 24, 42, 5)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = screen
    ctx.beginPath()
    ctx.roundRect(-9, -17, 18, 34, 3)
    ctx.fill()
  } else if (g.tier === 3) {
    // tablet
    ctx.fillStyle = body
    ctx.strokeStyle = edge
    ctx.beginPath()
    ctx.roundRect(-30, -22, 60, 44, 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = screen
    ctx.beginPath()
    ctx.roundRect(-25, -17, 50, 34, 3)
    ctx.fill()
  } else if (g.tier === 4) {
    // laptop
    ctx.fillStyle = body
    ctx.strokeStyle = edge
    ctx.beginPath()
    ctx.roundRect(-40, -30, 80, 46, 4)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = screen
    ctx.beginPath()
    ctx.roundRect(-34, -24, 68, 34, 2)
    ctx.fill()
    ctx.fillStyle = edge
    ctx.beginPath()
    ctx.roundRect(-46, 16, 92, 9, 4)
    ctx.fill()
  } else {
    // monitor — the apex predator
    ctx.fillStyle = body
    ctx.strokeStyle = '#ef4444'
    ctx.beginPath()
    ctx.roundRect(-52, -38, 104, 64, 5)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#451a1a'
    ctx.beginPath()
    ctx.roundRect(-46, -32, 92, 52, 3)
    ctx.fill()
    ctx.fillStyle = edge
    ctx.fillRect(-7, 26, 14, 10)
    ctx.beginPath()
    ctx.roundRect(-24, 36, 48, 6, 3)
    ctx.fill()
  }
  ctx.restore()
}

function drawPlayer(ctx: CanvasRenderingContext2D, s: FrenzyState) {
  ctx.save()
  ctx.translate(s.x, s.y)
  if (s.facing === -1) ctx.scale(-1, 1)
  if (s.inv > 0 && Math.floor(s.inv * 10) % 2 === 0) ctx.globalAlpha = 0.4

  const w = s.r * 2
  const h = s.r * 1.25
  // power bank shell
  ctx.fillStyle = '#ff7a1a'
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, h / 3)
  ctx.fill()
  ctx.fillStyle = '#0a0a0b'
  ctx.beginPath()
  ctx.roundRect(-w / 2 + w * 0.08, -h / 2 + h * 0.16, w * 0.84, h * 0.68, h / 4)
  ctx.fill()
  // lightning bolt
  ctx.fillStyle = '#ffc04d'
  const b = s.r * 0.5
  ctx.beginPath()
  ctx.moveTo(-b * 0.1, -b)
  ctx.lineTo(-b * 0.7, b * 0.15)
  ctx.lineTo(-b * 0.1, b * 0.15)
  ctx.lineTo(-b * 0.3, b)
  ctx.lineTo(b * 0.6, -b * 0.15)
  ctx.lineTo(b * 0.05, -b * 0.15)
  ctx.closePath()
  ctx.fill()
  // eye (front side)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(w * 0.32, -h * 0.16, s.r * 0.18, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0a0a0b'
  ctx.beginPath()
  ctx.arc(w * 0.35, -h * 0.16, s.r * 0.09, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export default function ChargeFrenzy() {
  const unlocked = useGameUnlocked()
  const phase = useStore((s) => s.phase)
  const highScore = useStore((s) => s.frenzyHighScore)
  const setFrenzyHighScore = useStore((s) => s.setFrenzyHighScore)
  const t = useT()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<FrenzyState>(newGame())
  const [status, setStatus] = useState<'idle' | 'playing' | 'over'>('idle')
  const [finalScore, setFinalScore] = useState(0)
  const statusRef = useRef(status)
  statusRef.current = status

  useEffect(() => {
    if (!unlocked && statusRef.current === 'playing') endGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked])

  const endGame = () => {
    const s = stateRef.current
    setFinalScore(s.score)
    setFrenzyHighScore(s.score)
    setStatus('over')
    playGameSound('over')
  }

  const start = () => {
    stateRef.current = newGame()
    setStatus('playing')
  }

  // Background music follows the run (and the music toggle).
  const musicEnabled = useStore((s) => s.gameMusicEnabled)
  useEffect(() => {
    if (status === 'playing' && musicEnabled) startGameMusic('frenzy')
    else stopGameMusic()
    return () => stopGameMusic()
  }, [status, musicEnabled])

  useEffect(() => {
    if (status !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()

    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const k = stateRef.current.keys
      if (e.key === 'ArrowLeft' || e.key === 'a') k.left = down
      if (e.key === 'ArrowRight' || e.key === 'd') k.right = down
      if (e.key === 'ArrowUp' || e.key === 'w') k.up = down
      if (e.key === 'ArrowDown' || e.key === 's') k.down = down
      if (down && e.key.startsWith('Arrow')) e.preventDefault()
    }
    const keyDown = onKey(true)
    const keyUp = onKey(false)
    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scale = W / rect.width
      stateRef.current.targetX = (e.clientX - rect.left) * scale
      stateRef.current.targetY = (e.clientY - rect.top) * (H / rect.height)
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    canvas.addEventListener('mousemove', onMouse)

    const loop = (now: number) => {
      const s = stateRef.current
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      s.elapsed += dt

      // Keys nudge the target; the bank swims toward it.
      const keySpeed = 340 * dt
      if (s.keys.left) s.targetX -= keySpeed
      if (s.keys.right) s.targetX += keySpeed
      if (s.keys.up) s.targetY -= keySpeed
      if (s.keys.down) s.targetY += keySpeed
      s.targetX = Math.max(20, Math.min(W - 20, s.targetX))
      s.targetY = Math.max(20, Math.min(H - 20, s.targetY))

      const chase = 300 * dt
      const dx = s.targetX - s.x
      const dy = s.targetY - s.y
      s.x += Math.max(-chase, Math.min(chase, dx))
      s.y += Math.max(-chase, Math.min(chase, dy))
      if (Math.abs(dx) > 3) s.facing = dx < 0 ? -1 : 1

      s.spawnIn -= dt
      if (s.spawnIn <= 0) {
        s.spawnIn = Math.max(0.35, 0.9 - s.elapsed / 120)
        s.gadgets.push(spawnGadget(s))
      }

      for (const g of s.gadgets) {
        g.x += g.vx * dt
        g.y = g.baseY + Math.sin(s.elapsed * 2 + g.bobPhase) * g.bob
      }

      s.inv = Math.max(0, s.inv - dt)
      const surviving: Gadget[] = []
      for (const g of s.gadgets) {
        if (g.x < -80 || g.x > W + 80) continue
        const dist = Math.hypot(g.x - s.x, g.y - s.y)
        if (dist < (s.r + g.r) * 0.72) {
          if (s.r >= g.r) {
            s.score += TIERS[g.tier].pts * s.level
            s.r = Math.min(MAX_R, s.r + 1.1 + g.tier * 0.5)
            playGameSound('catch')
            if (s.r >= MAX_R) {
              // Level up: back to bite-size, faster world, points multiplied.
              s.level += 1
              s.r = START_R
              s.gadgets = []
              s.inv = 1.5
              s.levelFlash = 1.6
              break
            }
            continue
          }
          if (s.inv <= 0) {
            s.lives -= 1
            s.inv = 1.4
            s.flash = 0.35
            playGameSound('miss')
            continue // predator is consumed by the collision too
          }
        }
        surviving.push(g)
      }
      s.gadgets = s.levelFlash > 1.5 ? [] : surviving
      s.flash = Math.max(0, s.flash - dt)
      s.levelFlash = Math.max(0, s.levelFlash - dt)

      // Render
      ctx.fillStyle = '#0a0a0b'
      ctx.fillRect(0, 0, W, H)
      if (s.flash > 0) {
        ctx.fillStyle = `rgba(239,68,68,${s.flash * 0.5})`
        ctx.fillRect(0, 0, W, H)
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }

      for (const g of s.gadgets) drawGadget(ctx, g)
      drawPlayer(ctx, s)

      // HUD: score, growth meter, lives
      ctx.fillStyle = '#e8e8ec'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`${s.score}`, 16, 30)
      ctx.fillStyle = '#ff9440'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(`Lv.${s.level} ×${s.level}`, 16, 48)
      ctx.fillStyle = '#e8e8ec'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('❤'.repeat(Math.max(0, s.lives)), W - 16, 30)
      if (s.levelFlash > 0) {
        ctx.save()
        ctx.globalAlpha = Math.min(1, s.levelFlash)
        ctx.fillStyle = '#ffc04d'
        ctx.font = 'bold 34px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`⚡ LEVEL UP! ×${s.level}`, W / 2, H / 2 - 60)
        ctx.restore()
      }
      const growth = (s.r - START_R) / (MAX_R - START_R)
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.beginPath()
      ctx.roundRect(16, H - 18, 120, 7, 4)
      ctx.fill()
      ctx.fillStyle = '#ff7a1a'
      ctx.beginPath()
      ctx.roundRect(16, H - 18, Math.max(6, 120 * growth), 7, 4)
      ctx.fill()

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

  return (
    <div className="relative mt-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-xl border border-ink-700 bg-ink-950"
        style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 220px)' }}
      />
      {status !== 'playing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70 backdrop-blur-sm">
          <Gamepad2 size={36} className="text-brand-500" />
          {status === 'over' ? (
            <>
              <div className="text-2xl font-bold text-white">
                {phase === 'focus' ? t('game.breakOver') : t('game.gameOver')}
              </div>
              <div className="text-sm text-ink-300">
                {t('game.score')}: <span className="font-semibold text-brand-400">{finalScore}</span>
                {finalScore >= highScore && finalScore > 0 && ` · ${t('game.newHighScore')}`}
              </div>
            </>
          ) : (
            <div className="text-lg font-semibold text-white">{t('game.ready')}</div>
          )}
          {unlocked && (
            <button className="btn-primary" onClick={start}>
              <Play size={15} /> {status === 'over' ? t('game.playAgain') : t('game.start')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
