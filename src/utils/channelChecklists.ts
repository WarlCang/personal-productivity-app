import type { Lang } from '../i18n/dict'
import type { Subtask } from '../types'
import { uid } from './id'

/**
 * Per-channel QA checklists for the US website team — the items that prevent
 * burning ad budget on a broken pixel or sending an email with untagged
 * links. Inserted as subtasks from the task modal or by campaign playbooks.
 */

/** Built-ins use short ids ('site', 'email'…); custom checklists get slug ids. */
export type ChannelId = string

export interface ChannelChecklist {
  id: ChannelId
  name: { en: string; zh: string }
  chip: string
  items: { en: string; zh: string }[]
}

/** Chip styles assigned to user-created checklists, cycled by list position. */
export const CHECKLIST_CHIP_PALETTE = [
  'bg-purple-500/15 text-purple-300',
  'bg-rose-500/15 text-rose-300',
  'bg-teal-500/15 text-teal-300',
  'bg-indigo-500/15 text-indigo-300',
  'bg-amber-500/15 text-amber-300',
]

/**
 * Built-in starter set. The live, user-editable copies live in the zustand
 * store (seeded from this) — edit those in-app, not this file.
 */
export const DEFAULT_CHANNEL_CHECKLISTS: ChannelChecklist[] = [
  {
    id: 'site',
    name: { en: 'Site', zh: '站内' },
    chip: 'bg-brand-500/15 text-brand-400',
    items: [
      { en: 'Hero banner & homepage modules updated', zh: '首页 Banner 与模块已更新' },
      { en: 'Campaign collection page built & merchandised', zh: '活动专题页已搭建并配置商品' },
      { en: 'Discount codes created and test-ordered', zh: '折扣码已创建并下测试单验证' },
      { en: 'Mobile layout checked', zh: '移动端展示已检查' },
      { en: 'Countdown / end-date copy correct (US Eastern)', zh: '倒计时与结束时间文案正确（美东时间）' },
    ],
  },
  {
    id: 'email',
    name: { en: 'Email', zh: '邮件' },
    chip: 'bg-violet-500/15 text-violet-400',
    items: [
      { en: 'Audience segment confirmed', zh: '收件人分组已确认' },
      { en: 'Subject line A/B variants written', zh: '标题 A/B 方案已准备' },
      { en: 'All links UTM-tagged', zh: '所有链接已加 UTM 参数' },
      { en: 'Test send reviewed on mobile + desktop', zh: '测试邮件已在手机和桌面端检查' },
      { en: 'Send scheduled in US Eastern time', zh: '发送时间已按美东时间设置' },
    ],
  },
  {
    id: 'google',
    name: { en: 'Google Ads', zh: 'Google 广告' },
    chip: 'bg-sky-500/15 text-sky-400',
    items: [
      { en: 'Keywords / audiences finalized', zh: '关键词与受众已确定' },
      { en: 'Ad copy & assets uploaded', zh: '广告文案与素材已上传' },
      { en: 'Final URLs UTM-tagged', zh: '落地页链接已加 UTM 参数' },
      { en: 'Conversion tracking verified with a test', zh: '转化跟踪已实测验证' },
      { en: 'Budget, bids & schedule set (US Eastern)', zh: '预算、出价与投放时段已设置（美东时间）' },
    ],
  },
  {
    id: 'meta',
    name: { en: 'Meta Ads', zh: 'Meta 广告' },
    chip: 'bg-pink-500/15 text-pink-400',
    items: [
      { en: 'Audiences & exclusions set', zh: '受众与排除人群已设置' },
      { en: 'Creative in all placements / sizes', zh: '素材已覆盖全部版位尺寸' },
      { en: 'Pixel events firing correctly', zh: 'Pixel 事件触发已验证' },
      { en: 'Destination links UTM-tagged', zh: '落地链接已加 UTM 参数' },
      { en: 'Budget & schedule set (US Eastern)', zh: '预算与排期已设置（美东时间）' },
    ],
  },
  {
    id: 'product',
    name: { en: 'Shopify product', zh: 'Shopify 商品' },
    chip: 'bg-emerald-500/15 text-emerald-400',
    items: [
      { en: 'Variants & prices correct in all markets', zh: '变体与价格在所有市场均正确' },
      { en: 'Images uploaded with alt text', zh: '图片已上传并填写 alt 文本' },
      { en: 'SEO title & meta description written', zh: 'SEO 标题与描述已填写' },
      { en: 'Assigned to collections; redirect set if replacing a product', zh: '已加入对应 Collection；替换旧品时已设置跳转' },
      { en: 'Test order placed & refunded', zh: '已下测试单并退款验证' },
      { en: 'Product page checked on mobile', zh: '商品页移动端已检查' },
    ],
  },
  {
    id: 'theme',
    name: { en: 'Theme publish', zh: '主题发布' },
    chip: 'bg-yellow-500/15 text-yellow-400',
    items: [
      { en: 'Live theme duplicated as backup', zh: '已复制当前主题作为备份' },
      { en: 'Changes previewed on mobile + desktop', zh: '改动已在移动端与桌面端预览' },
      { en: 'Publish scheduled in US Eastern time', zh: '发布时间已按美东时间安排' },
      { en: 'Post-publish smoke test: home, collection, product, checkout', zh: '发布后冒烟测试：首页、Collection、商品页、结算' },
      { en: 'Rollback plan confirmed (which theme to restore)', zh: '回滚方案已确认（恢复哪个主题）' },
    ],
  },
]

export function checklistSubtasks(channel: ChannelChecklist, lang: Lang): Subtask[] {
  return channel.items.map((item) => ({
    id: uid(),
    title: lang === 'zh' ? item.zh : item.en,
    done: false,
  }))
}
