import { create } from 'zustand'
import { api, type AdminInvite, type AdminUser } from '../api/client'

export interface AdminGroup {
  id: string
  name: string
  promoPack: 'cn' | 'us'
}

interface AdminStore {
  users: AdminUser[]
  invites: AdminInvite[]
  groups: AdminGroup[]
  loaded: boolean

  load: () => Promise<void>
  createInvite: (email: string) => Promise<AdminInvite>
  revokeInvite: (id: string) => Promise<void>
  setUserStatus: (id: string, status: 'active' | 'disabled') => Promise<void>
  setUserAdmin: (id: string, isAdmin: boolean) => Promise<void>
  createGroup: (name: string) => Promise<void>
  renameGroup: (id: string, name: string) => Promise<void>
  setGroupPromoPack: (id: string, promoPack: 'cn' | 'us') => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  setMemberRole: (groupId: string, userId: string, role: 'leader' | 'member') => Promise<void>
  removeMember: (groupId: string, userId: string) => Promise<void>
}

export const useAdmin = create<AdminStore>()((set, get) => ({
  users: [],
  invites: [],
  groups: [],
  loaded: false,

  load: async () => {
    const [users, invites, groups] = await Promise.all([
      api<AdminUser[]>('GET', '/admin/users'),
      api<AdminInvite[]>('GET', '/admin/invites'),
      api<AdminGroup[]>('GET', '/admin/groups'),
    ])
    set({ users, invites, groups, loaded: true })
  },

  createInvite: async (email) => {
    const invite = await api<AdminInvite>('POST', '/admin/invites', { email })
    set({ invites: [invite, ...get().invites] })
    return invite
  },

  revokeInvite: async (id) => {
    await api('DELETE', `/admin/invites/${id}`)
    set({ invites: get().invites.filter((i) => i.id !== id) })
  },

  setUserStatus: async (id, status) => {
    await api('PATCH', `/admin/users/${id}`, { status })
    set({ users: get().users.map((u) => (u.id === id ? { ...u, status } : u)) })
  },

  setUserAdmin: async (id, isAdmin) => {
    await api('PATCH', `/admin/users/${id}`, { isAdmin })
    set({ users: get().users.map((u) => (u.id === id ? { ...u, isAdmin } : u)) })
  },

  createGroup: async (name) => {
    await api('POST', '/admin/groups', { name })
    await get().load()
  },

  renameGroup: async (id, name) => {
    await api('PATCH', `/admin/groups/${id}`, { name })
    await get().load()
  },

  setGroupPromoPack: async (id, promoPack) => {
    await api('PATCH', `/admin/groups/${id}`, { promoPack })
    set({ groups: get().groups.map((g) => (g.id === id ? { ...g, promoPack } : g)) })
  },

  deleteGroup: async (id) => {
    await api('DELETE', `/admin/groups/${id}`)
    await get().load()
  },

  setMemberRole: async (groupId, userId, role) => {
    await api('PUT', `/admin/groups/${groupId}/members/${userId}`, { role })
    await get().load()
  },

  removeMember: async (groupId, userId) => {
    await api('DELETE', `/admin/groups/${groupId}/members/${userId}`)
    await get().load()
  },
}))
