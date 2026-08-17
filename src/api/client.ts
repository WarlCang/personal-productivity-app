/**
 * Thin fetch wrapper for the company API. Handles bearer tokens and
 * transparently refreshes the access token once on a 401.
 */

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000'

export interface ApiUser {
  id: string
  email: string
  name: string
  isAdmin: boolean
}

export interface ApiGroup {
  id: string
  name: string
  role: 'leader' | 'member'
  /** Present on /me groups; admin endpoints may omit it. */
  promoPack?: 'cn' | 'us'
}

export interface ApiTokens {
  accessToken: string
  refreshToken: string
  user: ApiUser
}

export interface ServerTask {
  id: string
  title: string
  description: string | null
  done: boolean
  completedAt: string | null
  dueDate: string | null
  priority: 'low' | 'medium' | 'high' | null
  groupId: string | null
  createdBy: string
  createdByName?: string
  ownerId?: string
  ownerName?: string
  createdAt: string
}

export interface ServerAnnouncement {
  id: string
  scope: 'company' | 'group'
  groupId: string | null
  title: string
  body: string
  pinned: boolean
  authorName: string
  createdAt: string
  readAt: string | null
}

export interface AdminUser {
  id: string
  email: string
  name: string
  isAdmin: boolean
  status: 'active' | 'disabled'
  createdAt: string
  groups: ApiGroup[]
}

export interface AdminInvite {
  id: string
  email: string
  token: string
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
}

export interface GroupMember {
  userId: string
  name: string
  email: string
  role: 'leader' | 'member'
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(`${status} ${code}`)
  }
}

interface TokenStore {
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  setTokens: (access: string, refresh: string) => void
  onSessionExpired: () => void
}

let tokenStore: TokenStore | null = null

/** Wired up once by the auth store to avoid a circular import. */
export function bindTokenStore(store: TokenStore) {
  tokenStore = store
}

async function rawRequest(method: string, path: string, body?: unknown, token?: string | null) {
  return fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

let refreshing: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (!tokenStore) return false
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = tokenStore!.getRefreshToken()
      if (!refreshToken) return false
      const res = await rawRequest('POST', '/auth/refresh', { refreshToken })
      if (!res.ok) return false
      const data = (await res.json()) as ApiTokens
      tokenStore!.setTokens(data.accessToken, data.refreshToken)
      return true
    })().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res = await rawRequest(method, path, body, tokenStore?.getAccessToken())
  if (res.status === 401 && tokenStore?.getRefreshToken()) {
    if (await tryRefresh()) {
      res = await rawRequest(method, path, body, tokenStore?.getAccessToken())
    } else {
      tokenStore.onSessionExpired()
    }
  }
  if (!res.ok) {
    let code = 'unknown'
    try {
      code = ((await res.json()) as { error?: string }).error ?? 'unknown'
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, code)
  }
  return (await res.json()) as T
}
