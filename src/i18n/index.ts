import { zhCN, enUS } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import { useStore } from '../store/useStore'
import { translate, type TKey } from './dict'

export { translate } from './dict'
export type { TKey, Lang } from './dict'

/** Reactive translator bound to the current language. */
export function useT() {
  const lang = useStore((s) => s.language)
  return (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars)
}

export function useDateLocale(): Locale {
  const lang = useStore((s) => s.language)
  return lang === 'zh' ? zhCN : enUS
}
