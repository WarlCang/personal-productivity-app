import { useState, type FormEvent } from 'react'
import {
  Check,
  Copy,
  Dices,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { uid } from '../../utils/id'
import {
  decryptVault,
  deriveKey,
  encryptVault,
  generatePassword,
  newSalt,
  type VaultEntry,
} from '../../utils/vaultCrypto'

/**
 * Team credentials vault. Unlocking derives the AES key from the master
 * password; the key and decrypted entries live only in component state, so
 * closing the modal locks the vault again.
 */

function CopyButton({ value, title }: { value: string; title: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="cursor-pointer p-1 text-ink-400 transition-colors hover:text-ink-100"
      title={title}
      onClick={() => {
        void navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  )
}

function EntryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: VaultEntry
  onSave: (entry: VaultEntry) => void
  onCancel?: () => void
}) {
  const t = useT()
  const [name, setName] = useState(initial?.name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [password, setPassword] = useState(initial?.password ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !password) return
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      username: username.trim(),
      password,
      notes: notes.trim() || undefined,
    })
    if (!initial) {
      setName('')
      setUsername('')
      setPassword('')
      setNotes('')
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2 rounded-lg border border-ink-800 bg-ink-900 p-3">
      <input className="input px-2 py-1.5 text-sm" placeholder={t('vault.name')} value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="input px-2 py-1.5 text-sm" placeholder={t('vault.username')} value={username} onChange={(e) => setUsername(e.target.value)} />
      <div className="flex gap-1.5">
        <input
          className="input min-w-0 flex-1 px-2 py-1.5 font-mono text-sm"
          placeholder={t('vault.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="button"
          className="btn-ghost px-2"
          title={t('vault.generate')}
          onClick={() => setPassword(generatePassword())}
        >
          <Dices size={14} />
        </button>
      </div>
      <input className="input px-2 py-1.5 text-sm" placeholder={t('vault.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="col-span-2 flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={onCancel}>
            <X size={12} /> {t('vault.cancel')}
          </button>
        )}
        <button type="submit" className="btn-primary px-3 py-1.5 text-xs">
          {initial ? t('vault.saveEntry') : t('vault.add')}
        </button>
      </div>
    </form>
  )
}

function EntryRow({
  entry,
  onChange,
  onDelete,
}: {
  entry: VaultEntry
  onChange: (entry: VaultEntry) => void
  onDelete: () => void
}) {
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(false)
  const t = useT()

  if (editing) {
    return (
      <EntryForm
        initial={entry}
        onSave={(e) => {
          onChange(e)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <li className="group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-ink-850 px-3 py-2 text-sm">
      <span className="font-medium text-ink-100">{entry.name}</span>
      {entry.username && (
        <span className="flex items-center gap-0.5 text-xs text-ink-300">
          {entry.username}
          <CopyButton value={entry.username} title={t('vault.copyUser')} />
        </span>
      )}
      <span className="flex items-center gap-0.5 font-mono text-xs text-ink-300">
        {show ? entry.password : '••••••••'}
        <button
          className="cursor-pointer p-1 text-ink-400 transition-colors hover:text-ink-100"
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <CopyButton value={entry.password} title={t('vault.copyPass')} />
      </span>
      {entry.notes && <span className="text-[11px] text-ink-400">{entry.notes}</span>}
      <span className="flex-1" />
      <button
        className="cursor-pointer p-1 text-ink-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink-200"
        onClick={() => setEditing(true)}
      >
        <Pencil size={12} />
      </button>
      <button
        className="cursor-pointer p-1 text-ink-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
        onClick={onDelete}
      >
        <Trash2 size={12} />
      </button>
    </li>
  )
}

export default function PasswordVaultModal({ onClose }: { onClose: () => void }) {
  const vault = useStore((s) => s.vault)
  const setVault = useStore((s) => s.setVault)
  const t = useT()

  const [master, setMaster] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Unlocked state lives only here — closing the modal locks the vault.
  const [unlocked, setUnlocked] = useState<{
    key: CryptoKey
    salt: string
    entries: VaultEntry[]
  } | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const submitMaster = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (!vault) {
        if (master.length > 30) return setError(t('vault.tooLong'))
        if (master !== confirm) return setError(t('vault.mismatch'))
        const salt = newSalt()
        const key = await deriveKey(master, salt)
        setVault(await encryptVault(key, salt, []))
        setUnlocked({ key, salt, entries: [] })
      } else {
        const key = await deriveKey(master, vault.salt)
        try {
          const entries = await decryptVault(key, vault)
          setUnlocked({ key, salt: vault.salt, entries })
        } catch {
          setError(t('vault.wrong'))
        }
      }
    } finally {
      setMaster('')
      setConfirm('')
      setBusy(false)
    }
  }

  const persist = async (entries: VaultEntry[]) => {
    if (!unlocked) return
    setUnlocked({ ...unlocked, entries })
    setVault(await encryptVault(unlocked.key, unlocked.salt, entries))
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card flex max-h-[85vh] w-full max-w-xl flex-col p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <KeyRound size={17} className="text-brand-400" />
            {t('vault.title')}
          </h2>
          <div className="flex items-center gap-1">
            {unlocked && (
              <button className="btn-ghost px-2 text-xs" onClick={() => setUnlocked(null)}>
                <Lock size={13} /> {t('vault.lock')}
              </button>
            )}
            <button className="btn-ghost -mr-1 px-2" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {!unlocked ? (
          <form onSubmit={submitMaster} className="mx-auto mt-6 mb-4 flex w-full max-w-xs flex-col gap-3">
            <p className="text-center text-xs text-ink-400">
              {vault ? t('vault.unlockHint') : t('vault.createHint')}
            </p>
            <input
              autoFocus
              type="password"
              className="input"
              placeholder={t('vault.masterPlaceholder')}
              value={master}
              maxLength={30}
              onChange={(e) => setMaster(e.target.value)}
              required
            />
            {!vault && (
              <input
                type="password"
                className="input"
                placeholder={t('vault.confirmPlaceholder')}
                value={confirm}
                maxLength={30}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            )}
            {error && <p className="text-center text-xs text-brand-400">{error}</p>}
            <button type="submit" className="btn-primary justify-center" disabled={busy}>
              {vault ? t('vault.unlock') : t('vault.create')}
            </button>
            {vault && (
              <button
                type="button"
                className="cursor-pointer text-center text-[11px] text-ink-600 transition-colors hover:text-red-400"
                onClick={() => {
                  if (confirmReset(t('vault.resetConfirm'))) {
                    setVault(null)
                    setError(null)
                  }
                }}
              >
                {t('vault.reset')}
              </button>
            )}
          </form>
        ) : (
          <>
            <ul className="mt-4 flex flex-1 flex-col gap-1.5 overflow-y-auto">
              {unlocked.entries.length === 0 && (
                <p className="py-4 text-center text-sm text-ink-400">{t('vault.empty')}</p>
              )}
              {unlocked.entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onChange={(updated) =>
                    void persist(unlocked.entries.map((e) => (e.id === entry.id ? updated : e)))
                  }
                  onDelete={() => void persist(unlocked.entries.filter((e) => e.id !== entry.id))}
                />
              ))}
            </ul>
            <div className="mt-3">
              {showAdd ? (
                <EntryForm
                  onSave={(entry) => void persist([...unlocked.entries, entry])}
                  onCancel={() => setShowAdd(false)}
                />
              ) : (
                <button className="btn-ghost text-xs" onClick={() => setShowAdd(true)}>
                  <Plus size={13} /> {t('vault.add')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Module-scope wrapper: inside the modal, `confirm` is shadowed by the
// master-password confirmation state.
function confirmReset(message: string): boolean {
  return window.confirm(message)
}
