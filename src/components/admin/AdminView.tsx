import { useEffect, useState, type FormEvent } from 'react'
import {
  Check,
  Copy,
  Mail,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserMinus,
  Users,
  X,
} from 'lucide-react'
import type { AdminInvite, AdminUser } from '../../api/client'
import { useAdmin, type AdminGroup } from '../../store/useAdmin'
import { useAuth } from '../../store/useAuth'
import { useT } from '../../i18n'

const inputClass =
  'rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-500'
const smallBtn =
  'cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium transition-colors'

function InviteRow({ invite }: { invite: AdminInvite }) {
  const revokeInvite = useAdmin((s) => s.revokeInvite)
  const [copied, setCopied] = useState(false)
  const t = useT()

  const expired = !invite.acceptedAt && new Date(invite.expiresAt).getTime() < Date.now()
  const status = invite.acceptedAt
    ? t('admin.accepted')
    : expired
      ? t('admin.expired')
      : t('admin.pending')

  return (
    <li className="flex items-center gap-3 rounded-lg bg-ink-850 px-3 py-2 text-sm">
      <Mail size={14} className="shrink-0 text-ink-400" />
      <span className="flex-1 truncate text-ink-100">{invite.email}</span>
      <span
        className={`shrink-0 text-[11px] ${
          invite.acceptedAt ? 'text-ink-400' : expired ? 'text-brand-600' : 'text-brand-400'
        }`}
      >
        {status}
      </span>
      {!invite.acceptedAt && !expired && (
        <button
          onClick={() => {
            void navigator.clipboard.writeText(invite.token)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className={`${smallBtn} flex items-center gap-1 text-ink-300 hover:bg-ink-700 hover:text-ink-100`}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? t('admin.copied') : t('admin.copyCode')}
        </button>
      )}
      {!invite.acceptedAt && (
        <button
          onClick={() => void revokeInvite(invite.id)}
          title={t('admin.revoke')}
          className={`${smallBtn} text-ink-400 hover:bg-ink-700 hover:text-brand-400`}
        >
          <X size={12} />
        </button>
      )}
    </li>
  )
}

function InvitesSection() {
  const invites = useAdmin((s) => s.invites)
  const createInvite = useAdmin((s) => s.createInvite)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const t = useT()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(false)
    try {
      await createInvite(email.trim())
      setEmail('')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-ink-800 bg-ink-900 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-100">
        <Mail size={14} className="text-brand-400" />
        {t('admin.invites')}
      </h2>
      <form onSubmit={onSubmit} className="mb-3 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('admin.inviteEmail')}
          className={`${inputClass} flex-1`}
        />
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-400 disabled:opacity-60"
        >
          {t('admin.sendInvite')}
        </button>
      </form>
      {error && <p className="mb-2 text-xs text-brand-400">{t('admin.inviteError')}</p>}
      <p className="mb-3 text-[11px] text-ink-400">{t('admin.inviteHint')}</p>
      <ul className="flex flex-col gap-1.5">
        {invites.map((i) => (
          <InviteRow key={i.id} invite={i} />
        ))}
      </ul>
    </section>
  )
}

function UserRow({ u }: { u: AdminUser }) {
  const me = useAuth((s) => s.user)
  const setUserStatus = useAdmin((s) => s.setUserStatus)
  const setUserAdmin = useAdmin((s) => s.setUserAdmin)
  const t = useT()
  const isSelf = u.id === me?.id

  return (
    <li
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-ink-850 px-3 py-2 text-sm ${
        u.status === 'disabled' ? 'opacity-50' : ''
      }`}
    >
      <span className="font-medium text-ink-100">{u.name}</span>
      <span className="truncate text-xs text-ink-400">{u.email}</span>
      {u.isAdmin && (
        <span className="flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-semibold text-brand-400">
          <Shield size={10} />
          {t('admin.adminBadge')}
        </span>
      )}
      {u.groups.map((g) => (
        <span key={g.id} className="rounded-full bg-ink-700 px-2 py-0.5 text-[11px] text-ink-200">
          {g.name}
          {g.role === 'leader' ? ` · ${t('team.roleLeader')}` : ''}
        </span>
      ))}
      <span className="flex-1" />
      {!isSelf && (
        <>
          <button
            onClick={() => void setUserAdmin(u.id, !u.isAdmin)}
            className={`${smallBtn} text-ink-300 hover:bg-ink-700 hover:text-ink-100`}
          >
            {u.isAdmin ? t('admin.removeAdmin') : t('admin.makeAdmin')}
          </button>
          <button
            onClick={() => void setUserStatus(u.id, u.status === 'active' ? 'disabled' : 'active')}
            className={`${smallBtn} ${
              u.status === 'active'
                ? 'text-ink-300 hover:bg-ink-700 hover:text-brand-400'
                : 'text-brand-400 hover:bg-ink-700'
            }`}
          >
            {u.status === 'active' ? t('admin.disable') : t('admin.enable')}
          </button>
        </>
      )}
    </li>
  )
}

function GroupCard({ group }: { group: AdminGroup }) {
  const users = useAdmin((s) => s.users)
  const renameGroup = useAdmin((s) => s.renameGroup)
  const deleteGroup = useAdmin((s) => s.deleteGroup)
  const setGroupPromoPack = useAdmin((s) => s.setGroupPromoPack)
  const setMemberRole = useAdmin((s) => s.setMemberRole)
  const removeMember = useAdmin((s) => s.removeMember)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(group.name)
  const [addUserId, setAddUserId] = useState('')
  const t = useT()

  const members = users
    .filter((u) => u.groups.some((g) => g.id === group.id))
    .map((u) => ({ ...u, role: u.groups.find((g) => g.id === group.id)!.role }))
  const nonMembers = users.filter(
    (u) => u.status === 'active' && !u.groups.some((g) => g.id === group.id),
  )

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 p-4">
      <div className="mb-3 flex items-center gap-2">
        {renaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setRenaming(false)
              if (name.trim() && name.trim() !== group.name) void renameGroup(group.id, name.trim())
            }}
            className="flex flex-1 gap-2"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setRenaming(false)}
              className={`${inputClass} flex-1 py-1`}
            />
          </form>
        ) : (
          <h3 className="flex-1 text-sm font-semibold text-ink-100">{group.name}</h3>
        )}
        <button
          onClick={() => {
            setName(group.name)
            setRenaming(true)
          }}
          title={t('admin.rename')}
          className={`${smallBtn} text-ink-400 hover:bg-ink-700 hover:text-ink-100`}
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => {
            if (confirm(t('admin.deleteGroupConfirm', { name: group.name }))) {
              void deleteGroup(group.id)
            }
          }}
          title={t('admin.deleteGroup')}
          className={`${smallBtn} text-ink-400 hover:bg-ink-700 hover:text-brand-400`}
        >
          <Trash2 size={12} />
        </button>
      </div>

      <label className="mb-3 flex items-center gap-2 text-[11px] text-ink-400">
        {t('admin.promoPack')}
        <select
          value={group.promoPack}
          onChange={(e) => void setGroupPromoPack(group.id, e.target.value as 'cn' | 'us')}
          className="cursor-pointer rounded-md border border-ink-700 bg-ink-900 px-1.5 py-0.5 text-[11px] text-ink-200 outline-none"
        >
          <option value="cn">{t('admin.packCn')}</option>
          <option value="us">{t('admin.packUs')}</option>
        </select>
      </label>

      <ul className="flex flex-col gap-1.5">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-lg bg-ink-850 px-3 py-1.5 text-sm">
            <span className="flex-1 truncate text-ink-100">{m.name}</span>
            <select
              value={m.role}
              onChange={(e) => void setMemberRole(group.id, m.id, e.target.value as 'leader' | 'member')}
              className="cursor-pointer rounded-md border border-ink-700 bg-ink-900 px-1.5 py-0.5 text-[11px] text-ink-200 outline-none"
            >
              <option value="member">{t('team.roleMember')}</option>
              <option value="leader">{t('team.roleLeader')}</option>
            </select>
            <button
              onClick={() => void removeMember(group.id, m.id)}
              title={t('admin.removeFromGroup')}
              className={`${smallBtn} text-ink-400 hover:bg-ink-700 hover:text-brand-400`}
            >
              <UserMinus size={12} />
            </button>
          </li>
        ))}
      </ul>

      {nonMembers.length > 0 && (
        <select
          value={addUserId}
          onChange={(e) => {
            const userId = e.target.value
            setAddUserId('')
            if (userId) void setMemberRole(group.id, userId, 'member')
          }}
          className={`${inputClass} mt-2 w-full cursor-pointer`}
        >
          <option value="">{t('admin.addMember')}</option>
          {nonMembers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

export default function AdminView() {
  const loaded = useAdmin((s) => s.loaded)
  const load = useAdmin((s) => s.load)
  const users = useAdmin((s) => s.users)
  const groups = useAdmin((s) => s.groups)
  const createGroup = useAdmin((s) => s.createGroup)
  const [newGroup, setNewGroup] = useState('')
  const t = useT()

  useEffect(() => {
    void load()
  }, [load])

  if (!loaded) return null

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6 flex items-center gap-2">
        <Shield size={18} className="text-brand-400" />
        <h1 className="text-xl font-bold text-white">{t('admin.title')}</h1>
      </header>

      <div className="flex flex-col gap-5">
        <InvitesSection />

        <section className="rounded-xl border border-ink-800 bg-ink-900 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-100">
            <Users size={14} className="text-brand-400" />
            {t('admin.users')} ({users.length})
          </h2>
          <ul className="flex flex-col gap-1.5">
            {users.map((u) => (
              <UserRow key={u.id} u={u} />
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-100">{t('admin.groups')}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!newGroup.trim()) return
                void createGroup(newGroup.trim())
                setNewGroup('')
              }}
              className="flex gap-2"
            >
              <input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder={t('admin.groupName')}
                className={`${inputClass} py-1.5`}
              />
              <button
                type="submit"
                className="flex cursor-pointer items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-400"
              >
                <Plus size={14} />
                {t('admin.newGroup')}
              </button>
            </form>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
