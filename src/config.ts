import type { PromoPackId } from './utils/promoCalendar'

/**
 * Master switch for the company (online) edition: login, team view, admin
 * console, server sync. Temporarily OFF — the app runs offline-only for the
 * US website team pilot while features are worked out. Flip to true to
 * restore the full company edition (server in `server/` is unchanged).
 */
export const COMPANY_MODE = false

/** Promo calendar shown while offline — the pilot users are the US website team. */
export const OFFLINE_PROMO_PACKS: PromoPackId[] = ['us']
