import { addDays, format, parseISO } from 'date-fns'
import type { Lang } from '../i18n/dict'
import type { Priority, Subtask } from '../types'
import { checklistSubtasks, type ChannelChecklist, type ChannelId } from './channelChecklists'

/**
 * Campaign playbooks for the US website team: a reusable T-minus task tree
 * instantiated backwards from a go-live date. Steps land in the personal todo
 * list, tagged with the campaign (e.g. #bfcm-2026) so the tag filter shows
 * the whole campaign at a glance. Steps tied to a channel carry that
 * channel's QA checklist as subtasks.
 */

export interface PlaybookStep {
  /** Days relative to go-live; negative = before. */
  offset: number
  title: { en: string; zh: string }
  priority?: Priority
  /** Attach this channel's QA checklist as subtasks. */
  channel?: ChannelId
}

export interface Playbook {
  id: string
  name: { en: string; zh: string }
  /** Promo event id prefix used to suggest a go-live date (e.g. 'bf' → bf-2026). */
  promoIdPrefix?: string
  steps: PlaybookStep[]
}

/**
 * Built-in starter set. The live, user-editable copies live in the zustand
 * store (seeded from this) — edit those in-app, not this file.
 */
export const DEFAULT_PLAYBOOKS: Playbook[] = [
  {
    id: 'bfcm',
    name: { en: 'BFCM (Black Friday / Cyber Monday)', zh: 'BFCM（黑五网一）' },
    promoIdPrefix: 'bf-',
    steps: [
      { offset: -45, title: { en: 'Promo plan & revenue targets approved', zh: '大促方案与营收目标确认' }, priority: 'high' },
      { offset: -35, title: { en: 'Offer & discount structure finalized', zh: '折扣与优惠结构确定' }, priority: 'high' },
      { offset: -30, title: { en: 'Creative brief submitted to design', zh: '设计需求 Brief 提交' } },
      { offset: -21, title: { en: 'Email campaigns & flows drafted', zh: '邮件campaign与flow初稿完成' }, channel: 'email' },
      { offset: -18, title: { en: 'Campaign landing / collection page built', zh: '活动落地页搭建完成' }, channel: 'site' },
      { offset: -14, title: { en: 'Google Ads campaigns set up', zh: 'Google 广告系列搭建' }, channel: 'google' },
      { offset: -14, title: { en: 'Meta ads set up', zh: 'Meta 广告搭建' }, channel: 'meta' },
      { offset: -7, title: { en: 'Discount codes created & QA pass', zh: '折扣码创建与全站 QA' }, channel: 'site', priority: 'high' },
      { offset: -3, title: { en: 'Schedule emails & ads, final cross-channel QA', zh: '邮件广告排期，全渠道最终检查' }, priority: 'high' },
      { offset: 0, title: { en: 'Go-live checklist & monitoring', zh: '上线检查与实时监控' }, priority: 'high' },
      { offset: 3, title: { en: 'Mid-sale performance check, shift budgets', zh: '促中数据复查与预算调整' } },
      { offset: 7, title: { en: 'Campaign recap & learnings', zh: '大促复盘与经验沉淀' } },
    ],
  },
  {
    id: 'prime',
    name: { en: 'Prime Day counter-campaign', zh: 'Prime Day 站外承接' },
    promoIdPrefix: 'prime-',
    steps: [
      { offset: -30, title: { en: 'Counter-campaign plan & targets', zh: '承接方案与目标确认' }, priority: 'high' },
      { offset: -21, title: { en: 'Offer finalized, creative brief out', zh: '优惠确定，设计 Brief 提交' } },
      { offset: -14, title: { en: 'Landing page & site banners ready', zh: '落地页与站内 Banner 就绪' }, channel: 'site' },
      { offset: -10, title: { en: 'Email campaign built', zh: '邮件 campaign 搭建' }, channel: 'email' },
      { offset: -7, title: { en: 'Paid campaigns set up (Google + Meta)', zh: '付费广告搭建（Google + Meta）' }, channel: 'google' },
      { offset: -3, title: { en: 'Schedule & final QA', zh: '排期与最终检查' }, priority: 'high' },
      { offset: 0, title: { en: 'Go live & monitor', zh: '上线与监控' }, priority: 'high' },
      { offset: 5, title: { en: 'Recap & learnings', zh: '复盘与经验沉淀' } },
    ],
  },
  {
    id: 'launch',
    name: { en: 'Product launch (Shopify)', zh: '新品上架（Shopify）' },
    steps: [
      { offset: -21, title: { en: 'Product info, pricing & positioning finalized', zh: '商品信息、定价与定位确认' }, priority: 'high' },
      { offset: -14, title: { en: 'Images & copy brief to design', zh: '图片与文案需求提交设计' } },
      { offset: -10, title: { en: 'Product page built in Shopify', zh: 'Shopify 商品页搭建' }, channel: 'product' },
      { offset: -7, title: { en: 'Site merchandising: collections, banners, cross-sells', zh: '站内配置：Collection、Banner、关联推荐' }, channel: 'site' },
      { offset: -5, title: { en: 'Inventory confirmed with supply chain', zh: '与供应链确认库存到位' }, priority: 'high' },
      { offset: -3, title: { en: 'Launch email built & scheduled', zh: '上新邮件搭建与排期' }, channel: 'email' },
      { offset: 0, title: { en: 'Listing live — final QA & announce', zh: '商品上线 — 最终检查与官宣' }, priority: 'high' },
      { offset: 7, title: { en: 'First-week performance review', zh: '首周表现复盘' } },
    ],
  },
  {
    id: 'sale',
    name: { en: 'Generic site sale', zh: '常规站内促销' },
    steps: [
      { offset: -21, title: { en: 'Sale plan & offer approved', zh: '促销方案与优惠确认' }, priority: 'high' },
      { offset: -14, title: { en: 'Creative & landing page ready', zh: '素材与落地页就绪' }, channel: 'site' },
      { offset: -10, title: { en: 'Email campaign built', zh: '邮件 campaign 搭建' }, channel: 'email' },
      { offset: -7, title: { en: 'Paid campaigns set up', zh: '付费广告搭建' }, channel: 'meta' },
      { offset: -3, title: { en: 'Schedule & final QA', zh: '排期与最终检查' }, priority: 'high' },
      { offset: 0, title: { en: 'Go live & monitor', zh: '上线与监控' }, priority: 'high' },
      { offset: 5, title: { en: 'Recap & learnings', zh: '复盘与经验沉淀' } },
    ],
  },
]

export interface PlaybookTask {
  title: string
  dueDate: string
  priority?: Priority
  tags: string[]
  subtasks: Subtask[]
}

export function campaignTag(playbook: Playbook, goLive: string): string {
  return `${playbook.id}-${goLive.slice(0, 4)}`
}


export function instantiatePlaybook(
  playbook: Playbook,
  goLive: string,
  lang: Lang,
  checklists: ChannelChecklist[],
): PlaybookTask[] {
  const base = parseISO(goLive)
  const tag = campaignTag(playbook, goLive)
  return playbook.steps.map((step) => {
    const channel = step.channel && checklists.find((c) => c.id === step.channel)
    return {
      title: lang === 'zh' ? step.title.zh : step.title.en,
      dueDate: format(addDays(base, step.offset), 'yyyy-MM-dd'),
      priority: step.priority,
      tags: [tag],
      subtasks: channel ? checklistSubtasks(channel, lang) : [],
    }
  })
}
