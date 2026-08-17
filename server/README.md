# TORRAS Productivity — API server (company edition)

Fastify + TypeScript + Drizzle. Locally the database is **PGlite** (embedded
Postgres, data in `server/data/`, nothing to install). In production, set
`DATABASE_URL` to a managed PostgreSQL and the same code runs unchanged.

## Commands (run inside `server/`)

```sh
npm install        # once
npm run seed       # create demo users/groups (admin@torras.com / torras123, …)
npm run dev        # start API on http://127.0.0.1:4000 (watch mode)
npm test           # role/permission + auth test suite
npm run db:generate  # regenerate SQL migration after editing src/db/schema.ts
```

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | unset → PGlite | Postgres connection string in production |
| `JWT_SECRET` | dev value | MUST be set in production |
| `PORT` / `HOST` | 4000 / 127.0.0.1 | listen address |

## API surface (Phase 1+2 core)

- `POST /auth/login` · `/auth/refresh` · `/auth/logout` · `/auth/accept-invite`, `GET /me`
- Admin: `POST/GET /admin/invites`, `GET /admin/users`, `PATCH /admin/users/:id`,
  `POST/GET /admin/groups`, `PUT/DELETE /admin/groups/:gid/members/:uid`
- Tasks: `GET/POST /tasks`, `PATCH/DELETE /tasks/:id`,
  `POST /groups/:gid/tasks` (leader assigns), `GET /groups/:gid/tasks` (leader overview),
  `GET /groups/:gid/members`
- Announcements: `POST/GET /announcements`, `POST /announcements/:id/read`

Permission rules are enforced server-side on every endpoint and covered by
`test/permissions.test.ts` — the client only hides UI. Invite emails are
logged to the console for now; company SMTP gets wired in at deployment.
