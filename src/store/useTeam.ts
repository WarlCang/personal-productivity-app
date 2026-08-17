import { create } from 'zustand'
import {
  api,
  type GroupMember,
  type ServerAnnouncement,
  type ServerTask,
} from '../api/client'
import { useAuth } from './useAuth'

interface TeamStore {
  /** Server tasks in my workspace (personal + assigned to me). */
  myTasks: ServerTask[]
  announcements: ServerAnnouncement[]
  /** Group task overviews, keyed by group id (leaders only). */
  groupTasks: Record<string, ServerTask[]>
  membersByGroup: Record<string, GroupMember[]>
  loaded: boolean

  refresh: () => Promise<void>
  loadGroupDetails: (groupId: string) => Promise<void>
  completeTask: (taskId: string, done: boolean) => Promise<void>
  assignTask: (groupId: string, assigneeId: string, title: string) => Promise<void>
  postAnnouncement: (
    scope: 'company' | 'group',
    groupId: string | null,
    title: string,
    body: string,
  ) => Promise<void>
  markRead: (announcementId: string) => Promise<void>
}

export const useTeam = create<TeamStore>()((set, get) => ({
  myTasks: [],
  announcements: [],
  groupTasks: {},
  membersByGroup: {},
  loaded: false,

  refresh: async () => {
    if (!useAuth.getState().accessToken) return
    try {
      const [myTasks, announcements] = await Promise.all([
        api<ServerTask[]>('GET', '/tasks'),
        api<ServerAnnouncement[]>('GET', '/announcements'),
      ])
      set({ myTasks, announcements, loaded: true })
    } catch {
      // Offline — keep showing the last known data.
    }
  },

  loadGroupDetails: async (groupId) => {
    const [members, tasks] = await Promise.all([
      api<GroupMember[]>('GET', `/groups/${groupId}/members`),
      api<ServerTask[]>('GET', `/groups/${groupId}/tasks`).catch(() => null),
    ])
    set({
      membersByGroup: { ...get().membersByGroup, [groupId]: members },
      ...(tasks ? { groupTasks: { ...get().groupTasks, [groupId]: tasks } } : {}),
    })
  },

  completeTask: async (taskId, done) => {
    // Optimistic toggle; refresh() reconciles afterwards.
    set({
      myTasks: get().myTasks.map((t) => (t.id === taskId ? { ...t, done } : t)),
    })
    try {
      await api('PATCH', `/tasks/${taskId}`, { done })
    } finally {
      void get().refresh()
    }
  },

  assignTask: async (groupId, assigneeId, title) => {
    await api('POST', `/groups/${groupId}/tasks`, { assigneeId, title })
    await get().loadGroupDetails(groupId)
  },

  postAnnouncement: async (scope, groupId, title, body) => {
    await api('POST', '/announcements', {
      scope,
      ...(scope === 'group' ? { groupId } : {}),
      title,
      body,
    })
    await get().refresh()
  },

  markRead: async (announcementId) => {
    set({
      announcements: get().announcements.map((a) =>
        a.id === announcementId ? { ...a, readAt: a.readAt ?? new Date().toISOString() } : a,
      ),
    })
    await api('POST', `/announcements/${announcementId}/read`).catch(() => {})
  },
}))

export function useUnreadCount(): number {
  return useTeam((s) => s.announcements.filter((a) => !a.readAt).length)
}

export function useAssignedToMe(): ServerTask[] {
  const myId = useAuth((s) => s.user?.id)
  return useTeam((s) => s.myTasks).filter((t) => t.createdBy !== myId)
}
