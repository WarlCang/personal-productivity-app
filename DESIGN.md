# TORRAS Productivity — Multi-User Company Edition: Design

Status: **planning** (approved decisions below; implementation not started)
Date: 2026-06-11

## Approved decisions

| Question | Decision |
|---|---|
| Scale | 500+ users (whole company) |
| Hosting | Chinese cloud (Aliyun or Tencent Cloud) |
| Login | Email + password, by admin invitation |
| Clients | Desktop apps only — Electron for macOS and Windows, with mandatory auto-update |
| Earlier decision | No Apple Developer account (macOS installs keep the one-time "Open Anyway" step) |

## 1. Architecture overview

```
┌────────────────────┐        HTTPS (REST + SSE)        ┌──────────────────────────┐
│  Electron client   │ ◄──────────────────────────────► │  API server (Node.js)    │
│  macOS / Windows   │                                  │  Fastify + TypeScript    │
│  (existing React   │      auto-update artifacts       │                          │
│   app + login)     │ ◄──────────────┐                 │  ┌────────────────────┐  │
└────────────────────┘                │                 │  │ PostgreSQL (RDS)   │  │
                                      │                 │  └────────────────────┘  │
                              ┌───────┴───────┐         └──────────────────────────┘
                              │ Object storage │
                              │ (OSS/COS):     │
                              │ installers +   │
                              │ update feeds   │
                              └───────────────┘
```

- **Client**: the existing React app, now with a login screen and a sync layer.
  The Zustand store stops persisting to localStorage as source of truth; shared
  entities live on the server, with optimistic updates locally.
- **API**: Node.js + Fastify + TypeScript, REST + JSON. Server-Sent Events (SSE)
  for real-time pushes (task assigned, new announcement) — simpler than
  WebSockets and sufficient for one-directional notification.
- **Database**: PostgreSQL (managed RDS on Aliyun/Tencent). 500 users of a
  productivity app is light load — one mid-size instance is plenty.
- **Auth**: email invite → set password → JWT access token (15 min) + refresh
  token (30 days, rotated). Argon2 password hashing. Rate-limited login.
- **Updates**: electron-updater with the "generic" provider pointing at OSS.
  Apps check for updates on launch and install silently. This is what makes
  desktop-only viable at 500+ users.

## 2. Groups, roles, and permissions

Structure mirrors how TORRAS already works (运营 / 市场 / 设计 / 供应链 / 客服):

- A **user** belongs to one or more **groups**.
- Per-group role: **leader (组长)** or **member (成员)**.
- A global **admin (管理员)** flag for IT/owners.

| Capability | Member | Group Leader | Admin |
|---|---|---|---|
| Personal todos / notes / pomodoro / game | ✓ | ✓ | ✓ |
| See & complete tasks assigned to them | ✓ | ✓ | ✓ |
| Assign tasks to members of their group | | ✓ | ✓ |
| Create/manage group kanban boards | | ✓ | ✓ |
| Post announcements to their group | | ✓ | ✓ |
| Post company-wide announcements | | | ✓ |
| See group task progress overview | | ✓ | ✓ |
| Invite users, create groups, set roles | | | ✓ |

Principles:
- **Enforcement is server-side on every endpoint**; the client only hides UI.
- **Pomodoro/focus stats stay private** to the individual — leaders see task
  completion, not personal focus minutes. (Surveillance features poison
  adoption; revisit only with explicit consent design.)
- Notes stay personal in this phase; shared docs are a later consideration.

## 3. Data model (PostgreSQL)

```
users          id, email, name, password_hash, is_admin, status(active|disabled), created_at
invites        id, email, token, invited_by, expires_at, accepted_at
groups         id, name, created_at
group_members  group_id, user_id, role(leader|member)        -- PK (group_id, user_id)

boards         id, title, owner_id NULL, group_id NULL        -- exactly one of owner/group set
columns        id, board_id, title, position, is_done_column
tasks          id, title, description, column_id, position, done, completed_at,
               due_date, priority, tags text[], subtasks jsonb,
               owner_id,                -- whose workspace it lives in (assignee)
               created_by,              -- who created/assigned it
               group_id NULL,           -- set when assigned through a group
               created_at
events         id, title, date, start_time, end_time, recurrence jsonb,
               owner_id NULL, group_id NULL                   -- personal or group calendar
notes          id, owner_id, title, content, folder, created_at, updated_at
announcements  id, author_id, scope(company|group), group_id NULL,
               title, body, pinned, created_at
announcement_reads  announcement_id, user_id, read_at         -- read receipts
focus_sessions id, user_id, date, minutes, task_id NULL, completed_at
refresh_tokens id, user_id, token_hash, expires_at, revoked_at
audit_log      id, actor_id, action, target_type, target_id, at   -- admin/leader actions
```

Client-side static data (China work calendar, promo calendar, i18n) stays in
the client bundle — no server involvement.

## 4. What changes in the existing client

| Feature | Today | Company edition |
|---|---|---|
| Todos | local | personal tasks on server + "Assigned to me" section with assigner shown |
| Kanban | local boards | personal boards + group boards (leaders manage) |
| Calendar | local events | personal events + group events overlay |
| Notes | local | personal, server-stored (synced across devices) |
| Pomodoro | local | synced; stats remain private |
| Game | local high score | unchanged (local), optional company leaderboard later |
| New: Announcements | — | feed + unread badge; post UI for leaders/admins |
| New: Login/profile | — | invite acceptance, login, password reset |
| New: Admin console | — | users, invites, groups, roles (web-style pages inside the app) |

Migration: on first login, if the app finds existing localStorage data, offer a
one-time "Import my local data to my account."

## 5. Infrastructure (Aliyun reference; Tencent equivalents in brackets)

- **ECS** (CVM) 4C/8G: API server + serves update feed. ~¥300–500/月
- **RDS PostgreSQL** (TencentDB) small HA instance. ~¥300–600/月
- **OSS** (COS): installers + electron-updater feed + future attachments. ~¥10/月
- **SSL + domain**: company domain subdomain, e.g. `productivity.torras.com`.
  If only reachable via office network/VPN, no ICP filing needed; a
  public-internet domain on a mainland server requires the company's ICP 备案.
- **Backups**: RDS automatic daily + weekly OSS dump. Test restore quarterly.
- **Email** (invites/password reset): Aliyun DirectMail or company SMTP.

## 6. Distribution & updates

- **Windows**: NSIS `.exe` installer via electron-builder. Unsigned → SmartScreen
  shows "Windows protected your PC" once → "More info → Run anyway".
  Optional later: a standard Windows code-signing certificate (~US$100–400/yr,
  no Apple-style account needed) removes this after reputation builds.
- **macOS**: keep the current `.pkg` + INSTALL.txt flow ("Open Anyway" once).
- **Auto-update**: both platforms check the OSS feed on launch; updates install
  without user action. Release = `electron-builder --publish` upload to OSS.
- Optional zero-cost fallback: serve the same client at the server URL for
  browser access (useful for emergency access / unmanaged machines).

## 7. Build phases

**Phase 1 — Foundation** (biggest step)
Server skeleton (Fastify + Postgres + migrations), auth (invites, login, JWT,
reset), move tasks/boards/events/notes to per-user server storage with sync,
login screen in client, local-data import, auto-update pipeline, deploy.

**Phase 2 — Groups & assignment**
Groups + roles, admin console (users/invites/groups), task assignment
(assign → appears in member's todos with notification), group kanban boards,
leader's group progress view.

**Phase 3 — Announcements & real-time**
Announcement feed (company/group), read receipts, SSE push, in-app
notification center, desktop notifications.

**Phase 4 — Hardening & ops**
Audit log, rate limiting review, monitoring/alerts, backup drills, data export
(per-user JSON), Windows code-signing decision, optional WeCom (企业微信)
login as a second auth method.

Each phase ships something usable; Phase 1+2 is the minimum for "leaders
assign tasks to group members."

## 8. Open questions — answered 2026-06-11

1. **Server administration**: deferred. Develop and verify locally first
   (no rented server yet); rent an Aliyun/Tencent 轻量应用服务器 (~¥50–100/月)
   once the multi-role system is proven. Local dev uses PGlite (embedded
   Postgres, zero install); production sets `DATABASE_URL` to switch the same
   code to managed PostgreSQL.
2. **Network access**: reachable from anywhere; mainland-China users are the
   only audience that matters for latency. Consequence: the public domain on
   a mainland server will need the company's ICP 备案 before launch
   (paperwork task, does not block development).
3. **Email**: TORRAS has company SMTP — use it for invites/password resets.
   During local development, invite emails are logged to the console instead.
4. **Cloud provider**: decide later, at deployment time. Nothing in the code
   depends on the choice.

Implementation note: password hashing uses Node's built-in scrypt (a
memory-hard KDF, zero native dependencies) instead of Argon2 — avoids
native-module build friction; both are acceptable; revisit at Phase 4 if
desired.

## 9. Pilot: NA website team — feature direction (2026-06-12)

Context: all employees sit in Shenzhen (China work calendar stays). The NA
website team runs torras.com for the US market: the site itself, email
campaigns to site-registered users, and paid acquisition (Google Ads + Meta
Ads are major). They do not care about CN promo days (618/双11).

Differentiation stance vs 飞书 (which TORRAS uses today): don't compete on
IM/docs/approvals — be vertical (encode TORRAS's e-commerce rhythm) and
personal-first (protect maker time; focus stats stay private). Later:
integrate via a Feishu bot for task notifications rather than building chat.

Planned features, in build order:
1. **Group-scoped promo packs** — promo calendar becomes per-group config;
   keep the CN work calendar globally. NA pack: BFCM/Cyber Week, Prime Day,
   Memorial Day, July 4, Labor Day, Mother's/Father's Day, back-to-school,
   Christmas + shipping cutoffs. Home countdowns follow the user's groups.
2. **Market-time display** — store go-lives as US-time instants; render
   dual-clock (北京时间 + US Eastern, DST-correct) everywhere; US market
   clock on the dashboard. (Email sends "9am US" = 10pm/11pm China — the
   app does the timezone math, not people.)
3. **Playbook engine** — reusable campaign templates per retail moment with
   T-minus dates computed backwards from a US-time go-live; tasks
   auto-assigned into members' lists. BFCM template is the flagship.
4. **Channel tracks** on campaigns: Site / Email / Google Ads / Meta Ads,
   with per-channel readiness shown on the campaign card. Paid checklist
   includes UTM + conversion-tracking QA before spend.
5. **Email send sub-calendar** rendered in both clocks by default.

Other teams later get their own packs/playbooks through mechanism #1 —
features differ per team via config, not code forks.

## 10. Current implementation status

**2026-06-12: US-team offline features shipped.** Campaign playbooks
(BFCM / Prime Day / generic sale → T-minus tasks tagged per campaign),
US-Eastern entry mode on calendar events (DST-correct, verified), channel QA
checklists (Site/Email/Google/Meta) insertable as subtasks, and a UTM link
builder in the sidebar. All client-local; playbook/checklist content lives in
`src/utils/playbooks.ts` and `channelChecklists.ts` for easy editing.

Shopify Tier 1 (same day): "Product launch (Shopify)" playbook; Shopify
product & theme-publish QA checklists; Quick-links panel (Shopify admin
sections via configurable store handle + marketing consoles); local
discount-code registry with ET validity dates and status. Tier 2 (direct
Shopify Admin API from Electron with a custom-app token: live readiness
checks, sales widget, inventory warnings) deliberately deferred until the
playbooks have survived one real campaign.

**2026-06-13: campaign hub & deeper customization.** New 大促 Campaigns view
(playbook instantiation now records a campaign: progress bar, go-live
countdown, linked discount codes, jump-to-tasks). Channel checklists are
user-editable in-app (same store-seeded pattern as playbooks/quick links).
Playbooks optionally add a US-time go-live event to the calendar. UTM builder
prefills from registered discount codes. Tasks support recurrence
(daily/weekly/monthly — completing spawns the next occurrence). Backup/export
explicitly deferred (upgrade-in-place preserves data; see §10 notes).

**2026-06-12: temporarily offline-only.** `COMPANY_MODE = false` in
`src/config.ts` hides login/team/admin and disables sync; the app runs
local-only for the US website team pilot (promo pack defaults to 'us', US
Eastern market clock shows). The server and all company-edition code remain
in the tree and tested — flip the flag to restore the online edition.

- `server/` — Fastify + TypeScript API: auth (invites, login, JWT + rotating
  refresh tokens), groups & roles, task assignment, announcements, with the
  permission matrix enforced server-side and covered by tests.
- Verification order: prove roles/permissions locally (server + tests) →
  wire the client login/sync → then rent the server and deploy.
