import { useState, type FormEvent } from 'react'
import { Languages } from 'lucide-react'
import { ApiError } from '../../api/client'
import { useAuth } from '../../store/useAuth'
import { useStore } from '../../store/useStore'
import { useT, type TKey } from '../../i18n'

type Mode = 'login' | 'invite'

function errorKey(err: unknown, mode: Mode): TKey {
  if (err instanceof ApiError) {
    if (mode === 'invite') return 'login.inviteInvalid'
    if (err.status === 401) return 'login.invalid'
    if (err.status === 403) return 'login.disabled'
  }
  return 'login.network'
}

const inputClass =
  'w-full rounded-lg border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-500'

export default function LoginScreen() {
  const login = useAuth((s) => s.login)
  const acceptInvite = useAuth((s) => s.acceptInvite)
  const language = useStore((s) => s.language)
  const setLanguage = useStore((s) => s.setLanguage)
  const t = useT()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<TKey | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') await login(email.trim(), password)
      else await acceptInvite(inviteToken.trim(), name.trim(), password)
    } catch (err) {
      setError(errorKey(err, mode))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-ink-950">
      <div className="w-full max-w-sm px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-xl font-black text-ink-950">
            T
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-[0.18em] text-white">TORRAS</div>
            <div className="text-xs tracking-wide text-ink-400">{t('login.subtitle')}</div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {mode === 'login' ? (
            <>
              <input
                type="email"
                required
                autoFocus
                placeholder={t('login.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              <input
                type="password"
                required
                placeholder={t('login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </>
          ) : (
            <>
              <input
                required
                autoFocus
                placeholder={t('login.inviteToken')}
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                className={inputClass}
              />
              <input
                required
                placeholder={t('login.yourName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder={t('login.newPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </>
          )}

          {error && <div className="text-sm text-brand-400">{t(error)}</div>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 cursor-pointer rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-400 disabled:opacity-60"
          >
            {busy ? t('login.working') : mode === 'login' ? t('login.signIn') : t('login.acceptInvite')}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'invite' : 'login')
              setError(null)
            }}
            className="cursor-pointer text-xs text-ink-400 transition-colors hover:text-brand-400"
          >
            {mode === 'login' ? t('login.haveInvite') : t('login.backToLogin')}
          </button>
          <button
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
            className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
          >
            <Languages size={12} />
            {language === 'en' ? '中文' : 'EN'}
          </button>
        </div>
      </div>
    </div>
  )
}
