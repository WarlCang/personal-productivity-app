import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { eq } from 'drizzle-orm'
import Fastify from 'fastify'
import type { Db } from './db/client.js'
import { users } from './db/schema.js'
import { adminRoutes } from './routes/admin.js'
import { announcementRoutes } from './routes/announcements.js'
import { authRoutes } from './routes/auth.js'
import { taskRoutes } from './routes/tasks.js'
import './types.js'

export async function buildApp(db: Db, opts: { logger?: boolean } = {}) {
  const app = Fastify({ logger: opts.logger ?? false })

  await app.register(cors, { origin: true })
  await app.register(rateLimit, { global: false })
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-before-deploy',
  })

  app.decorate('db', db)

  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.code(401).send({ error: 'unauthorized' })
    }
    const [user] = await db.select().from(users).where(eq(users.id, request.user.sub))
    if (!user || user.status !== 'active') {
      return reply.code(401).send({ error: 'unauthorized' })
    }
    request.currentUser = user
  })

  app.decorate('requireAdmin', async (request, reply) => {
    if (!request.currentUser?.isAdmin) {
      return reply.code(403).send({ error: 'forbidden' })
    }
  })

  app.get('/health', async () => ({ ok: true }))

  // Friendly index so opening the base URL in a browser doesn't look broken —
  // everything except GET endpoints must be called with POST/PATCH/PUT/DELETE.
  app.get('/', async () => ({
    name: 'TORRAS Productivity API',
    health: 'GET /health',
    auth: ['POST /auth/login', 'POST /auth/refresh', 'POST /auth/accept-invite', 'GET /me'],
    tasks: [
      'GET /tasks',
      'POST /tasks',
      'PATCH /tasks/:taskId',
      'POST /groups/:groupId/tasks',
      'GET /groups/:groupId/tasks',
      'GET /groups/:groupId/members',
    ],
    announcements: ['GET /announcements', 'POST /announcements'],
    admin: ['POST /admin/invites', 'GET /admin/users', 'POST /admin/groups'],
  }))

  await app.register(authRoutes)
  await app.register(adminRoutes)
  await app.register(taskRoutes)
  await app.register(announcementRoutes)

  return app
}
