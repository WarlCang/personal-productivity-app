import type { Lang, TKey } from '../i18n/dict'

/**
 * TORRAS workspace presets: product-line / team tags, kanban board
 * templates for common TORRAS workflows, and note templates.
 */

export interface PresetTag {
  tag: string
  chip: string
}

export const PRESET_TAGS: PresetTag[] = [
  // Product lines
  { tag: 'ostand', chip: 'bg-brand-500/15 text-brand-400' },
  { tag: 'coolify', chip: 'bg-cyan-500/15 text-cyan-400' },
  { tag: '保护壳', chip: 'bg-violet-500/15 text-violet-400' },
  { tag: '充电', chip: 'bg-yellow-500/15 text-yellow-400' },
  // Teams
  { tag: '运营', chip: 'bg-emerald-500/15 text-emerald-400' },
  { tag: '市场', chip: 'bg-pink-500/15 text-pink-400' },
  { tag: '设计', chip: 'bg-sky-500/15 text-sky-400' },
  { tag: '供应链', chip: 'bg-orange-500/15 text-orange-300' },
  { tag: '客服', chip: 'bg-lime-500/15 text-lime-400' },
]

const presetChipByTag = new Map(PRESET_TAGS.map((p) => [p.tag, p.chip]))

export function tagChipClass(tag: string): string {
  return presetChipByTag.get(tag) ?? 'bg-ink-800 text-ink-300'
}

export interface BoardTemplate {
  nameKey: TKey
  columns: { en: string; zh: string; isDoneColumn?: boolean }[]
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    nameKey: 'kanban.template.launch',
    columns: [
      { en: 'Concept / Review', zh: '需求评审' },
      { en: 'Sampling', zh: '打样' },
      { en: 'Testing', zh: '测试验证' },
      { en: 'Listing Prep', zh: '上架准备' },
      { en: 'Launched', zh: '已上市', isDoneColumn: true },
    ],
  },
  {
    nameKey: 'kanban.template.campaign',
    columns: [
      { en: 'Brief', zh: 'Brief' },
      { en: 'Creative', zh: '素材制作' },
      { en: 'Review', zh: '审核' },
      { en: 'Live', zh: '投放中' },
      { en: 'Retro Done', zh: '已复盘', isDoneColumn: true },
    ],
  },
  {
    nameKey: 'kanban.template.listing',
    columns: [
      { en: 'Backlog', zh: '待优化' },
      { en: 'Optimizing', zh: '优化中' },
      { en: 'A/B Testing', zh: 'A/B 测试' },
      { en: 'Published', zh: '已发布', isDoneColumn: true },
    ],
  },
]

export function templateColumns(template: BoardTemplate, lang: Lang) {
  return template.columns.map((c) => ({ title: lang === 'zh' ? c.zh : c.en, isDoneColumn: c.isDoneColumn }))
}

export interface NoteTemplate {
  nameKey: TKey
  folder: { en: string; zh: string }
  title: (lang: Lang, dateLabel: string) => string
  content: { en: string; zh: string }
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    nameKey: 'notes.template.standup',
    folder: { en: 'Standups', zh: '站会' },
    title: (lang, date) => (lang === 'zh' ? `站会 ${date}` : `Standup ${date}`),
    content: {
      en: '<h2>Yesterday</h2><ul><li><p></p></li></ul><h2>Today</h2><ul><li><p></p></li></ul><h2>Blockers</h2><ul><li><p></p></li></ul>',
      zh: '<h2>昨天完成</h2><ul><li><p></p></li></ul><h2>今天计划</h2><ul><li><p></p></li></ul><h2>遇到的问题</h2><ul><li><p></p></li></ul>',
    },
  },
  {
    nameKey: 'notes.template.weekly',
    folder: { en: 'Weekly Reviews', zh: '周报' },
    title: (lang, date) => (lang === 'zh' ? `周报 ${date}` : `Weekly Review ${date}`),
    content: {
      en: '<h2>Key results</h2><ul><li><p></p></li></ul><h2>Data (GMV / ad spend / conversion)</h2><ul><li><p></p></li></ul><h2>Problems &amp; learnings</h2><ul><li><p></p></li></ul><h2>Next week</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>',
      zh: '<h2>本周关键结果</h2><ul><li><p></p></li></ul><h2>数据（GMV / 投放 / 转化）</h2><ul><li><p></p></li></ul><h2>问题与反思</h2><ul><li><p></p></li></ul><h2>下周计划</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>',
    },
  },
  {
    nameKey: 'notes.template.brief',
    folder: { en: 'Product', zh: '产品' },
    title: (lang) => (lang === 'zh' ? '产品简报：' : 'Product brief: '),
    content: {
      en: '<h2>Product / line</h2><p>Ostand / COOLIFY / Case / Charging</p><h2>Target user &amp; scenario</h2><p></p><h2>Key selling points</h2><ul><li><p></p></li></ul><h2>Pricing &amp; positioning</h2><p></p><h2>Launch channels</h2><p>Amazon / Shopify / TikTok / 天猫 / 京东</p><h2>Timeline</h2><p></p>',
      zh: '<h2>产品 / 产品线</h2><p>Ostand / COOLIFY / 保护壳 / 充电</p><h2>目标用户与场景</h2><p></p><h2>核心卖点</h2><ul><li><p></p></li></ul><h2>定价与定位</h2><p></p><h2>上市渠道</h2><p>Amazon / Shopify / TikTok / 天猫 / 京东</p><h2>时间计划</h2><p></p>',
    },
  },
  {
    nameKey: 'notes.template.teardown',
    folder: { en: 'Competitors', zh: '竞品' },
    title: (lang) => (lang === 'zh' ? '竞品分析：' : 'Competitor teardown: '),
    content: {
      en: '<h2>Competitor &amp; product</h2><p></p><h2>Price &amp; promo strategy</h2><p></p><h2>Listing / creative observations</h2><ul><li><p></p></li></ul><h2>Reviews — what customers praise / complain about</h2><ul><li><p></p></li></ul><h2>What we should do</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>',
      zh: '<h2>竞品与产品</h2><p></p><h2>价格与促销策略</h2><p></p><h2>Listing / 素材观察</h2><ul><li><p></p></li></ul><h2>评论分析 — 用户夸什么 / 抱怨什么</h2><ul><li><p></p></li></ul><h2>我们的行动项</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>',
    },
  },
]
