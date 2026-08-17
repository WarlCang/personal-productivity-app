import { useEffect, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { Check, LogOut, Megaphone, Pin, RefreshCw, Send, UserPlus } from 'lucide-react'
import { useAuth, useLedGroups } from '../../store/useAuth'
import { useAssignedToMe, useTeam } from '../../store/useTeam'
import { useT } from '../../i18n'
import type { ServerAnnouncement } from '../../api/client'

const inputClass =
  'rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-500'

function AnnouncementCard({ a }: { a: ServerAnnouncement }) {
  const markRead = useTeam((s) => s.markRead)
  const [open, setOpen] = useState(false)
  const t = useT()

  return (
    <button
      onClick={() => {
        setOpen(!open)
        if (!a.readAt) void markRead(a.id)
      }}
      className={`block w-full cursor-pointer rounded-lg border px-4 py-3 text-left transition-colors ${
        a.readAt ? 'border-ink-800 bg-ink-900' : 'border-brand-500/40 bg-ink-850'
      }`}
    >
      <div className="flex items-center gap-2">
        {!a.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
        {a.pinned && <Pin size={12} className="shrink-0 text-brand-400" />}
        <span className="flex-1 truncate text-sm font-semibold text-ink-100">{a.title}</span>
        <span className="shrink-0 text-[11px] text-ink-400">
          {format(new Date(a.createdAt), 'MM-dd')}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-ink-400">
        {a.scope === 'company' ? t('team.scopeCompany') : ''} {a.authorName}
      </div>
      {open && <div className="mt-2 text-sm whitespace-pre-wrap text-ink-200">{a.body}</div>}
    </button>
  )
}

function AssignForm({ groupId }: { groupId: string }) {
  const members = useTeam((s) => s.membersByGroup[groupId]) ?? []
  const assignTask = useTeam((s) => s.assignTask)
  const myId = useAuth((s) => s.user?.id)
  const [assigneeId, setAssigneeId] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const t = useT()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!assigneeId || !title.trim()) return
    setBusy(true)
    try {
      await assignTask(groupId, assigneeId, title.trim())
      setTitle('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <select
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
        required
        className={`${inputClass} cursor-pointer`}
      >
        <option value="">{t('team.assignTo')}</option>
        {members
          .filter((m) => m.userId !== myId)
          .map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
      </select>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('team.taskTitle')}
        required
        className={`${inputClass} min-w-40 flex-1`}
      />
      <button
        type="submit"
        disabled={busy}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-400 disabled:opacity-60"
      >
        <UserPlus size={14} />
        {t('team.assign')}
      </button>
    </form>
  )
}

function LeaderPanel({ groupId, groupName }: { groupId: string; groupName: string }) {
  const tasks = useTeam((s) => s.groupTasks[groupId]) ?? []
  const loadGroupDetails = useTeam((s) => s.loadGroupDetails)
  const t = useT()

  useEffect(() => {
    void loadGroupDetails(groupId)
  }, [groupId, loadGroupDetails])

  const done = tasks.filter((x) => x.done).length

  return (
    <section className="rounded-xl border border-ink-800 bg-ink-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-100">
          {t('team.groupProgress', { group: groupName })}
        </h3>
        <span className="text-xs text-ink-400">
          {t('team.progressCount', { done, total: tasks.length })}
        </span>
      </div>
      <AssignForm groupId={groupId} />
      {tasks.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2.5 rounded-lg bg-ink-850 px-3 py-2 text-sm"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  task.done ? 'border-brand-500 bg-brand-500 text-ink-950' : 'border-ink-600'
                }`}
              >
                {task.done && <Check size={11} strokeWidth={3} />}
              </span>
              <span className={`flex-1 truncate ${task.done ? 'text-ink-400 line-through' : 'text-ink-100'}`}>
                {task.title}
              </span>
              <span className="shrink-0 text-xs text-ink-400">{task.ownerName}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PostAnnouncementForm() {
  const ledGroups = useLedGroups()
  const isAdmin = useAuth((s) => s.user?.isAdmin ?? false)
  const postAnnouncement = useTeam((s) => s.postAnnouncement)
  const [target, setTarget] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const t = useT()

  if (!isAdmin && ledGroups.length === 0) return null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!target || !title.trim() || !body.trim()) return
    setBusy(true)
    try {
      await postAnnouncement(
        target === 'company' ? 'company' : 'group',
        target === 'company' ? null : target,
        title.trim(),
        body.trim(),
      )
      setTitle('')
      setBody('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded-xl border border-ink-800 bg-ink-900 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-100">
        <Megaphone size={14} className="text-brand-400" />
        {t('team.post')}
      </h3>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        required
        className={`${inputClass} cursor-pointer`}
      >
        <option value="">—</option>
        {isAdmin && <option value="company">{t('team.scopeCompany')}</option>}
        {ledGroups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('team.postTitle')}
        required
        className={inputClass}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t('team.postBody')}
        required
        rows={3}
        className={`${inputClass} resize-y`}
      />
      <button
        type="submit"
        disabled={busy}
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-400 disabled:opacity-60"
      >
        <Send size={14} />
        {t('team.publish')}
      </button>
    </form>
  )
}

export default function TeamView() {
  const user = useAuth((s) => s.user)
  const groups = useAuth((s) => s.groups)
  const logout = useAuth((s) => s.logout)
  const ledGroups = useLedGroups()
  const assigned = useAssignedToMe()
  const announcements = useTeam((s) => s.announcements)
  const completeTask = useTeam((s) => s.completeTask)
  const refresh = useTeam((s) => s.refresh)
  const t = useT()

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">{t('team.title')}</h1>
          <div className="mt-0.5 text-xs text-ink-400">
            {user?.name}
            {user?.isAdmin && ' · 管理员'}
            {groups.map((g) => (
              <span key={g.id}>
                {' · '}
                {g.name} {g.role === 'leader' ? t('team.roleLeader') : t('team.roleMember')}
              </span>
            ))}
          </div>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => void refresh()}
          title={t('team.refresh')}
          className="cursor-pointer rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
        >
          <RefreshCw size={15} />
        </button>
        <button
          onClick={logout}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-brand-500/50 hover:text-ink-100"
        >
          <LogOut size={13} />
          {t('team.logout')}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-ink-800 bg-ink-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-100">{t('team.assignedToMe')}</h2>
          {assigned.length === 0 ? (
            <p className="text-sm text-ink-400">{t('team.noAssigned')}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {assigned.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-2.5 rounded-lg bg-ink-850 px-3 py-2.5 text-sm"
                >
                  <button
                    onClick={() => void completeTask(task.id, !task.done)}
                    className={`flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                      task.done
                        ? 'border-brand-500 bg-brand-500 text-ink-950'
                        : 'border-ink-600 hover:border-brand-500'
                    }`}
                  >
                    {task.done && <Check size={12} strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 ${task.done ? 'text-ink-400 line-through' : 'text-ink-100'}`}>
                    {task.title}
                  </span>
                  {task.createdByName && (
                    <span className="shrink-0 text-[11px] text-ink-400">
                      {t('team.assignedBy', { name: task.createdByName })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-ink-800 bg-ink-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-100">{t('team.announcements')}</h2>
          {announcements.length === 0 ? (
            <p className="text-sm text-ink-400">{t('team.noAnnouncements')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {announcements.map((a) => (
                <AnnouncementCard key={a.id} a={a} />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        <PostAnnouncementForm />
        {ledGroups.map((g) => (
          <LeaderPanel key={g.id} groupId={g.id} groupName={g.name} />
        ))}
      </div>
    </div>
  )
}
