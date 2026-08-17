import { useState } from 'react'
import { Lock, Music, Timer, VolumeX } from 'lucide-react'
import { useStore, useGameUnlocked } from '../../store/useStore'
import { useT } from '../../i18n'
import DropDefense from './DropDefense'
import ChargeFrenzy from './ChargeFrenzy'

type GameId = 'drop' | 'frenzy'

export default function GameView() {
  const unlocked = useGameUnlocked()
  const secondsLeft = useStore((s) => s.secondsLeft)
  const dropHigh = useStore((s) => s.gameHighScore)
  const frenzyHigh = useStore((s) => s.frenzyHighScore)
  const musicEnabled = useStore((s) => s.gameMusicEnabled)
  const setGameMusicEnabled = useStore((s) => s.setGameMusicEnabled)
  const setView = useStore((s) => s.setView)
  const startPomodoro = useStore((s) => s.startPomodoro)
  const t = useT()

  const [game, setGame] = useState<GameId>('drop')

  if (!unlocked) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-700 bg-ink-900">
          <Lock size={26} className="text-ink-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">{t('game.lockedTitle')}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-ink-400">{t('game.lockedBody')}</p>
        <button
          className="btn-primary"
          onClick={() => {
            startPomodoro()
            setView('pomodoro')
          }}
        >
          <Timer size={15} /> {t('game.startFocus')}
        </button>
        {(dropHigh > 0 || frenzyHigh > 0) && (
          <p className="text-xs text-ink-500">
            {t('game.highScore')}: {t('game.title')} {dropHigh} · {t('game.frenzyTitle')} {frenzyHigh}
          </p>
        )}
      </div>
    )
  }

  const highScore = game === 'drop' ? dropHigh : frenzyHigh

  return (
    <div className="flex h-full flex-col items-center px-6 py-8">
      <div className="flex w-full max-w-[520px] items-baseline justify-between">
        <h1 className="text-2xl font-bold text-white">
          {t(game === 'drop' ? 'game.title' : 'game.frenzyTitle')}
        </h1>
        <div className="text-xs text-ink-400">
          {t('game.breakEndsIn')}{' '}
          <span className="font-mono text-emerald-400">
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          </span>
          {' · '}
          {t('game.highScore')} <span className="text-brand-400">{highScore}</span>
          <button
            className="ml-2 cursor-pointer rounded-md p-1 align-middle text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
            title={t(musicEnabled ? 'game.musicOn' : 'game.musicOff')}
            onClick={() => setGameMusicEnabled(!musicEnabled)}
          >
            {musicEnabled ? <Music size={13} /> : <VolumeX size={13} />}
          </button>
        </div>
      </div>

      <div className="mt-2 flex w-full max-w-[520px] gap-1.5">
        {(
          [
            { id: 'drop', label: t('game.title') },
            { id: 'frenzy', label: t('game.frenzyTitle') },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setGame(id)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              game === id
                ? 'bg-brand-500/15 text-brand-400'
                : 'bg-ink-850 text-ink-400 hover:text-ink-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mt-2 w-full max-w-[520px] text-xs text-ink-400">
        {t(game === 'drop' ? 'game.instructions' : 'game.frenzyInstructions')}
      </p>

      {game === 'drop' ? <DropDefense /> : <ChargeFrenzy />}
    </div>
  )
}
