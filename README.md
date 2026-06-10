# TORRAS Productivity

A personal productivity app in TORRAS brand colors (black + orange): todo list, kanban board, calendar, rich-text notes, pomodoro timer, and a break-time mini game.

All data is stored locally in your browser (localStorage) — no account, no server.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Features

- **Todos** — quick-add tasks with optional priority, tags, subtasks, and due dates. Filter by tag, sort by date/priority.
- **Kanban** — the same tasks on a drag-and-drop board. Columns are customizable; dropping a card into *Done* completes the task (and vice versa).
- **Calendar** — month and week views. Tasks with due dates appear automatically; standalone events support start/end times and daily/weekly/monthly recurrence.
- **Notes** — Notion-style rich text editor (TipTap) with folders, search, and checklists.
- **Pomodoro** — configurable focus/break cycles with long breaks, sound + browser notifications, per-day focus stats, and optional task linking ("Focus on this" from any task).
- **Drop Defense** — catch falling phones in a TORRAS case. Only playable during pomodoro breaks: focus to earn play time. Mouse or ←/→ to move; golden phones are worth 50.

## Stack

React 18 + TypeScript + Vite, Zustand (persisted state), Tailwind CSS 4, dnd-kit, TipTap, date-fns, canvas for the game.
