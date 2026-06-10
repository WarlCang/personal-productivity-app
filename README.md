# TORRAS Productivity

A personal productivity app for TORRAS employees in brand colors (black + orange): todo list, kanban board, calendar, rich-text notes, pomodoro timer, and a break-time mini game.

All data is stored locally in your browser (localStorage) — no account, no server. The full UI is bilingual (English / 中文) via the toggle at the bottom of the sidebar.

## TORRAS-specific features

- **Workspace presets** — built-in product-line tags (ostand, coolify, 保护壳, 充电) and team tags (运营, 市场, 设计, 供应链, 客服) with brand colors, one click to add from any task.
- **Kanban templates** — Product Launch (需求评审→打样→测试→上架→已上市), Marketing Campaign (Brief→素材→审核→投放→复盘), and Listing Optimization board layouts.
- **Note templates** — daily standup, 周报 weekly review, product brief, and competitor teardown, localized to the active language.
- **Promo calendar** — 618, 双11, 双12, 38大促, 88会员节, Prime Day (est.), Black Friday, Cyber Monday, and gifting holidays as a calendar layer with "days until" countdown chips (`src/utils/promoCalendar.ts`).
- **Chinese work calendar** — statutory holidays (休) and 调休 makeup workdays (班) per the State Council annual notice.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Features

- **Home dashboard** — greeting with today's work-calendar status, quick-add, open-task and focus-time stat cards, next promo countdowns, due & overdue tasks, and today's schedule.
- **Todos** — quick-add tasks with optional priority, tags, subtasks, and due dates. Filter by tag, sort by date/priority.
- **Kanban** — multiple boards with a tab switcher (double-click a tab to rename). Columns are customizable; dropping a card into *Done* completes the task (and vice versa). Templates create new boards.
- **Keyboard shortcuts** — `1–7` switch views, `n` quick-adds a task from anywhere, `/` opens universal search across tasks, notes, and events. Due/overdue tasks show a count in the tab title and trigger one notification per day (when notifications are enabled).
- **Calendar** — month and week views. Tasks with due dates appear automatically; standalone events support start/end times and daily/weekly/monthly recurrence. Follows the Chinese work calendar: statutory holidays are marked 休 and weekend makeup workdays (调休) are marked 班, per the State Council's annual notice (2026 data from 国办发明电〔2025〕7号; see `src/utils/chinaWorkCalendar.ts` for sources and how to add future years).
- **Notes** — Notion-style rich text editor (TipTap) with folders, search, and checklists.
- **Pomodoro** — configurable focus/break cycles with long breaks, sound + browser notifications, per-day focus stats, and optional task linking ("Focus on this" from any task).
- **Drop Defense** — catch falling phones in a TORRAS case. Only playable during pomodoro breaks: focus to earn play time. Mouse or ←/→ to move; golden phones are worth 50.

## Stack

React 18 + TypeScript + Vite, Zustand (persisted state), Tailwind CSS 4, dnd-kit, TipTap, date-fns, canvas for the game.
