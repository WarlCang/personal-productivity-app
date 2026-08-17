import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  api,
  bindTokenStore,
  type ApiGroup,
  type ApiTokens,
  type ApiUser,
} from '../api/client'
import { DEFAULT_PACKS, type PromoPackId } from '../utils/promoCalendar'
import { COMPANY_MODE, OFFLINE_PROMO_PACKS } from '../config'

interface AuthStore {
  user: ApiUser | null
  groups: ApiGroup[]
  accessToken: string | null
  refreshToken: string | null

  login: (email: string, password: string) => Promise<void>
  acceptInvite: (token: string, name: string, password: string) => Promise<void>
  /** Refreshes profile + group roles from the server; ignores network failures. */
  loadMe: () => Promise<void>
  logout: () => void
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      groups: [],
      accessToken: null,
      refreshToken: null,

      login: async (email, password) => {
        const data = await api<ApiTokens>('POST', '/auth/login', { email, password })
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
        await get().loadMe()
      },

      acceptInvite: async (token, name, password) => {
        const data = await api<ApiTokens>('POST', '/auth/accept-invite', {
          token,
          name,
          password,
        })
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
        await get().loadMe()
      },

      loadMe: async () => {
        try {
          const me = await api<ApiUser & { groups: ApiGroup[] }>('GET', '/me')
          set({
            user: { id: me.id, email: me.email, name: me.name, isAdmin: me.isAdmin },
            groups: me.groups,
          })
        } catch {
          // Offline or server restarting — keep the cached session.
        }
      },

      logout: () => {
        const { refreshToken } = get()
        if (refreshToken) {
          api('POST', '/auth/logout', { refreshToken }).catch(() => {})
        }
        set({ user: null, groups: [], accessToken: null, refreshToken: null })
      },
    }),
    { name: 'torras-auth' },
  ),
)

bindTokenStore({
  getAccessToken: () => useAuth.getState().accessToken,
  getRefreshToken: () => useAuth.getState().refreshToken,
  setTokens: (accessToken, refreshToken) => useAuth.setState({ accessToken, refreshToken }),
  onSessionExpired: () =>
    useAuth.setState({ user: null, groups: [], accessToken: null, refreshToken: null }),
})

/** Groups the current user leads (admins lead everywhere they are a member). */
export function useLedGroups(): ApiGroup[] {
  const groups = useAuth((s) => s.groups)
  const isAdmin = useAuth((s) => s.user?.isAdmin ?? false)
  return groups.filter((g) => isAdmin || g.role === 'leader')
}

/**
 * Union of the promo packs of the user's groups; CN pack when groupless.
 * Offline (company mode off) the US pack applies — the pilot audience.
 */
export function usePromoPacks(): PromoPackId[] {
  const groups = useAuth((s) => s.groups)
  if (!COMPANY_MODE) return OFFLINE_PROMO_PACKS
  const packs = [...new Set(groups.map((g) => g.promoPack ?? 'cn'))]
  return packs.length > 0 ? packs : DEFAULT_PACKS
}
