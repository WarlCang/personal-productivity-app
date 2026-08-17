import { randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { groupMembers, groups, invites, users } from '../db/schema.js'

const inviteSchema = z.object({ email: z.string().email() })
const groupSchema = z.object({
  name: z.string().min(1).max(100),
  promoPack: z.enum(['cn', 'us']).optional(),
})
const groupPatchSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    promoPack: z.enum(['cn', 'us']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0)
const memberRoleSchema = z.object({ role: z.enum(['leader', 'member']) })
const userPatchSchema = z
  .object({
    status: z.enum(['active', 'disabled']).optional(),
    isAdmin: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0)
const idParams = z.object({ groupId: z.string().uuid(), userId: z.string().uuid() })

const INVITE_TTL_DAYS = 7

export async function adminRoutes(app: FastifyInstance) {
  const db = app.db
  const guard = { preHandler: [app.authenticate, app.requireAdmin] }

  app.post('/admin/invites', guard, async (request, reply) => {
    const body = inviteSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' })
    const email = body.data.email.toLowerCase()

    const [existingUser] = await db.select().from(users).where(eq(users.email, email))
    if (existingUser) return reply.code(409).send({ error: 'user_exists' })
    const [pending] = await db
      .select()
      .from(invites)
      .where(and(eq(invites.email, email), isNull(invites.acceptedAt)))
    if (pending && pending.expiresAt.getTime() > Date.now()) {
      return reply.code(409).send({ error: 'invite_pending' })
    }

    const [invite] = await db
      .insert(invites)
      .values({
        email,
        token: randomBytes(24).toString('hex'),
        invitedBy: request.currentUser.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      })
      .returning()
    // TODO Phase 1 deploy: send via company SMTP; for local dev the token is
    // returned to the admin UI and logged.
    app.log.info({ email, token: invite.token }, 'invite created (email sending stubbed)')
    return reply.code(201).send(invite)
  })

  app.get('/admin/invites', guard, async () => db.select().from(invites))

  app.delete('/admin/invites/:inviteId', guard, async (request, reply) => {
    const params = z.object({ inviteId: z.string().uuid() }).safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_request' })
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.id, params.data.inviteId))
    if (!invite) return reply.code(404).send({ error: 'not_found' })
    if (invite.acceptedAt) return reply.code(409).send({ error: 'already_accepted' })
    await db.delete(invites).where(eq(invites.id, invite.id))
    return { ok: true }
  })

  app.get('/admin/users', guard, async () => {
    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isAdmin: users.isAdmin,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
    const memberships = await db
      .select({
        userId: groupMembers.userId,
        groupId: groupMembers.groupId,
        role: groupMembers.role,
        groupName: groups.name,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    return userRows.map((u) => ({
      ...u,
      groups: memberships
        .filter((m) => m.userId === u.id)
        .map((m) => ({ id: m.groupId, name: m.groupName, role: m.role })),
    }))
  })

  app.patch('/admin/users/:userId', guard, async (request, reply) => {
    const params = z.object({ userId: z.string().uuid() }).safeParse(request.params)
    const body = userPatchSchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }
    // An admin cannot disable or demote themselves — prevents locking the
    // company out of the admin console entirely.
    if (
      params.data.userId === request.currentUser.id &&
      (body.data.status === 'disabled' || body.data.isAdmin === false)
    ) {
      return reply.code(400).send({ error: 'cannot_modify_self' })
    }
    const [updated] = await db
      .update(users)
      .set(body.data)
      .where(eq(users.id, params.data.userId))
      .returning()
    if (!updated) return reply.code(404).send({ error: 'not_found' })
    return { ok: true }
  })

  app.post('/admin/groups', guard, async (request, reply) => {
    const body = groupSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' })
    const [group] = await db
      .insert(groups)
      .values(body.data)
      .onConflictDoNothing()
      .returning()
    if (!group) return reply.code(409).send({ error: 'group_exists' })
    return reply.code(201).send(group)
  })

  app.get('/admin/groups', guard, async () => db.select().from(groups))

  app.patch('/admin/groups/:groupId', guard, async (request, reply) => {
    const params = z.object({ groupId: z.string().uuid() }).safeParse(request.params)
    const body = groupPatchSchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }
    const [updated] = await db
      .update(groups)
      .set(body.data)
      .where(eq(groups.id, params.data.groupId))
      .returning()
    if (!updated) return reply.code(404).send({ error: 'not_found' })
    return updated
  })

  // Members are removed via cascade; group tasks survive with group_id nulled
  // (they stay in each assignee's personal list); group announcements cascade.
  app.delete('/admin/groups/:groupId', guard, async (request, reply) => {
    const params = z.object({ groupId: z.string().uuid() }).safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_request' })
    const [deleted] = await db
      .delete(groups)
      .where(eq(groups.id, params.data.groupId))
      .returning()
    if (!deleted) return reply.code(404).send({ error: 'not_found' })
    return { ok: true }
  })

  app.put('/admin/groups/:groupId/members/:userId', guard, async (request, reply) => {
    const params = idParams.safeParse(request.params)
    const body = memberRoleSchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }
    const [user] = await db.select().from(users).where(eq(users.id, params.data.userId))
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, params.data.groupId))
    if (!user || !group) return reply.code(404).send({ error: 'not_found' })

    await db
      .insert(groupMembers)
      .values({
        groupId: params.data.groupId,
        userId: params.data.userId,
        role: body.data.role,
      })
      .onConflictDoUpdate({
        target: [groupMembers.groupId, groupMembers.userId],
        set: { role: body.data.role },
      })
    return { ok: true }
  })

  app.delete('/admin/groups/:groupId/members/:userId', guard, async (request, reply) => {
    const params = idParams.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_request' })
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, params.data.groupId),
          eq(groupMembers.userId, params.data.userId),
        ),
      )
    return { ok: true }
  })
}
