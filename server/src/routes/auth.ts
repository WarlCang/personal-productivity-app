import { and, eq, isNull } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '../lib/hash.js'
import {
  findActiveRefreshToken,
  issueTokens,
  revokeRefreshToken,
  sha256,
} from '../lib/tokens.js'
import { groupMembers, groups, invites, refreshTokens, users } from '../db/schema.js'

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })
const refreshSchema = z.object({ refreshToken: z.string().min(1) })
const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(200),
})

export async function authRoutes(app: FastifyInstance) {
  const db = app.db

  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: Number(process.env.LOGIN_RATE_LIMIT ?? 10),
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const body = loginSchema.safeParse(request.body)
      if (!body.success) return reply.code(400).send({ error: 'invalid_request' })

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, body.data.email.toLowerCase()))
      if (!user || !verifyPassword(body.data.password, user.passwordHash)) {
        return reply.code(401).send({ error: 'invalid_credentials' })
      }
      if (user.status !== 'active') {
        return reply.code(403).send({ error: 'account_disabled' })
      }
      return issueTokens(app, db, user)
    },
  )

  app.post('/auth/refresh', async (request, reply) => {
    const body = refreshSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' })

    const stored = await findActiveRefreshToken(db, body.data.refreshToken)
    if (!stored) return reply.code(401).send({ error: 'invalid_refresh_token' })

    const [user] = await db.select().from(users).where(eq(users.id, stored.userId))
    if (!user || user.status !== 'active') {
      return reply.code(401).send({ error: 'invalid_refresh_token' })
    }
    await revokeRefreshToken(db, stored.id)
    return issueTokens(app, db, user)
  })

  app.post('/auth/logout', async (request, reply) => {
    const body = refreshSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' })
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, sha256(body.data.refreshToken)),
          isNull(refreshTokens.revokedAt),
        ),
      )
    return { ok: true }
  })

  app.post('/auth/accept-invite', async (request, reply) => {
    const body = acceptInviteSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' })

    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.token, body.data.token))
    if (!invite || invite.acceptedAt || invite.expiresAt.getTime() < Date.now()) {
      return reply.code(400).send({ error: 'invalid_invite' })
    }
    const [existing] = await db.select().from(users).where(eq(users.email, invite.email))
    if (existing) return reply.code(400).send({ error: 'invalid_invite' })

    const [user] = await db
      .insert(users)
      .values({
        email: invite.email,
        name: body.data.name,
        passwordHash: hashPassword(body.data.password),
      })
      .returning()
    await db
      .update(invites)
      .set({ acceptedAt: new Date() })
      .where(eq(invites.id, invite.id))
    return reply.code(201).send(await issueTokens(app, db, user))
  })

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const me = request.currentUser
    const myGroups = await db
      .select({
        id: groups.id,
        name: groups.name,
        role: groupMembers.role,
        promoPack: groups.promoPack,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, me.id))
    return {
      id: me.id,
      email: me.email,
      name: me.name,
      isAdmin: me.isAdmin,
      groups: myGroups,
    }
  })
}
