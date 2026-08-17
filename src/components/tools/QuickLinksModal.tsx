import { useState, type FormEvent } from 'react'
import { Check, Pencil, Plus, Rocket, Store, Trash2, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import type { QuickLink } from '../../types'

/**
 * One-click launcher into the consoles the team lives in, shown as favicon
 * tiles (name on hover). The pencil toggles a manage mode with the full
 * editable list; the Shopify helper expands a store handle into the usual
 * admin-section links as ordinary editable entries.
 */

const SHOPIFY_SECTIONS: { path: string; en: string; zh: string }[] = [
  { path: '', en: 'Shopify admin', zh: 'Shopify 后台' },
  { path: '/products', en: 'Products', zh: 'Shopify 商品' },
  { path: '/collections', en: 'Collections', zh: 'Shopify Collections' },
  { path: '/discounts', en: 'Discounts', zh: 'Shopify 折扣' },
  { path: '/themes', en: 'Themes', zh: 'Shopify 主题' },
  { path: '/orders', en: 'Orders', zh: 'Shopify 订单' },
  { path: '/analytics', en: 'Analytics', zh: 'Shopify 分析' },
]

const FALLBACK_COLORS = [
  'bg-brand-500/20 text-brand-300',
  'bg-sky-500/20 text-sky-300',
  'bg-violet-500/20 text-violet-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-rose-500/20 text-rose-300',
  'bg-amber-500/20 text-amber-300',
]

function normalizeUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    new URL(withScheme)
    return withScheme
  } catch {
    return null
  }
}

function Favicon({ link, size }: { link: QuickLink; size: number }) {
  const [failed, setFailed] = useState(false)

  let origin: string | null = null
  try {
    origin = new URL(link.url).origin
  } catch {
    /* fallback below */
  }

  if (failed || !origin) {
    const color = FALLBACK_COLORS[(link.name.codePointAt(0) ?? 0) % FALLBACK_COLORS.length]
    return (
      <span
        className={`flex items-center justify-center rounded-md font-bold ${color}`}
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        {[...link.name][0]?.toUpperCase() ?? '?'}
      </span>
    )
  }
  return (
    <img
      src={`${origin}/favicon.ico`}
      alt=""
      width={size}
      height={size}
      className="rounded-md"
      onError={() => setFailed(true)}
    />
  )
}

function LinkRow({ link }: { link: QuickLink }) {
  const updateQuickLink = useStore((s) => s.updateQuickLink)
  const deleteQuickLink = useStore((s) => s.deleteQuickLink)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(link.name)
  const [url, setUrl] = useState(link.url)
  const t = useT()

  const saveEdit = () => {
    const normalized = normalizeUrl(url)
    if (!name.trim() || !normalized) return
    updateQuickLink(link.id, { name: name.trim(), url: normalized })
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="flex items-center gap-1.5 rounded-lg bg-ink-850 px-2 py-1.5">
        <input
          autoFocus
          className="input w-28 px-2 py-1 text-xs"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
        />
        <input
          className="input min-w-0 flex-1 px-2 py-1 text-xs"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
        />
        <button className="cursor-pointer p-1 text-emerald-400 hover:text-emerald-300" onClick={saveEdit}>
          <Check size={13} />
        </button>
        <button className="cursor-pointer p-1 text-ink-400 hover:text-ink-200" onClick={() => setEditing(false)}>
          <X size={13} />
        </button>
      </li>
    )
  }

  return (
    <li className="group flex items-center gap-2 rounded-lg bg-ink-850 px-2 py-1 transition-colors hover:bg-ink-800">
      <Favicon link={link} size={16} />
      <span className="min-w-0 flex-1 truncate text-sm text-ink-100" title={link.url}>
        {link.name}
      </span>
      <button
        className="cursor-pointer p-1 text-ink-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink-200"
        title={t('links.edit')}
        onClick={() => {
          setName(link.name)
          setUrl(link.url)
          setEditing(true)
        }}
      >
        <Pencil size={12} />
      </button>
      <button
        className="cursor-pointer p-1 text-ink-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
        title={t('links.delete')}
        onClick={() => deleteQuickLink(link.id)}
      >
        <Trash2 size={12} />
      </button>
    </li>
  )
}

export default function QuickLinksModal({ onClose }: { onClose: () => void }) {
  const links = useStore((s) => s.quickLinks)
  const addQuickLink = useStore((s) => s.addQuickLink)
  const addQuickLinks = useStore((s) => s.addQuickLinks)
  const handle = useStore((s) => s.shopifyStoreHandle)
  const setHandle = useStore((s) => s.setShopifyStoreHandle)
  const language = useStore((s) => s.language)
  const t = useT()

  const [manage, setManage] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const addNew = (e: FormEvent) => {
    e.preventDefault()
    const normalized = normalizeUrl(newUrl)
    if (!newName.trim() || !normalized) return
    addQuickLink(newName.trim(), normalized)
    setNewName('')
    setNewUrl('')
  }

  const addShopifySet = () => {
    if (!handle) return
    addQuickLinks(
      SHOPIFY_SECTIONS.map((s) => ({
        name: language === 'zh' ? s.zh : s.en,
        url: `https://admin.shopify.com/store/${handle}${s.path}`,
      })),
    )
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card flex max-h-[85vh] w-full max-w-md flex-col p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Rocket size={17} className="text-brand-400" />
            {t('links.title')}
          </h2>
          <div className="flex items-center gap-1">
            <button
              className={manage ? 'btn-primary px-2 py-1.5 text-xs' : 'btn-ghost px-2'}
              title={t('links.manage')}
              onClick={() => setManage(!manage)}
            >
              <Pencil size={13} />
            </button>
            <button className="btn-ghost -mr-1 px-2" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {links.length === 0 && !manage && (
          <p className="py-6 text-center text-sm text-ink-400">{t('links.empty')}</p>
        )}

        {!manage ? (
          <div className="mt-4 grid grid-cols-4 gap-2 overflow-y-auto">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                title={link.url}
                className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl bg-ink-850 px-1.5 py-3 transition-colors hover:bg-ink-800 hover:ring-1 hover:ring-brand-500/50"
              >
                <Favicon link={link} size={24} />
                <span className="w-full truncate text-center text-[11px] leading-tight text-ink-300">
                  {link.name}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <>
            <ul className="mt-4 flex flex-col gap-1 overflow-y-auto">
              {links.map((link) => (
                <LinkRow key={link.id} link={link} />
              ))}
            </ul>

            <form onSubmit={addNew} className="mt-3 flex items-center gap-1.5">
              <input
                className="input w-28 px-2 py-1.5 text-xs"
                placeholder={t('links.addName')}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className="input min-w-0 flex-1 px-2 py-1.5 text-xs"
                placeholder={t('links.addUrl')}
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
              <button
                type="submit"
                className="btn-primary px-2.5 py-1.5"
                disabled={!newName.trim() || !normalizeUrl(newUrl)}
              >
                <Plus size={14} />
              </button>
            </form>

            <div className="mt-4 border-t border-ink-800 pt-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs text-ink-400">
                <Store size={12} /> {t('links.shopifyHelper')}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  className="input min-w-0 flex-1 px-2 py-1.5 text-xs"
                  placeholder={t('links.handlePlaceholder')}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
                <button
                  className="btn-ghost px-2.5 py-1.5 text-xs whitespace-nowrap"
                  disabled={!handle}
                  onClick={addShopifySet}
                >
                  {t('links.addShopify')}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-ink-600">{t('links.handleHint')}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
