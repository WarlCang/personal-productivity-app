import { and, desc, eq, inArray, or } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getGroupRole, getUserGroupIds } from '../lib/permissions.js'
import { announcementReads, announcements, users } from '../db/schema.js'

const createSchema = z
  .object({
    scope: z.enum(['company', 'group']),
    groupId: z.string().uuid().optional(),
    title: z.string().min(1).max(300),
    body: z.string().min(1).max(20000),
    pinned: z.boolean().optional(),
  })
  .refine((v) => (v.scope === 'group') === (v.groupId !== undefined))

export async function announcementRoutes(app: FastifyInstance) {
  const db = app.db
  const guard = { preHandler: [app.authenticate] }

  app.post('/announcements', guard, async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' })
    const me = request.currentUser

    if (body.data.scope === 'company') {
      if (!me.isAdmin) return reply.code(403).send({ error: 'forbidden' })
    } else {
      const role = await getGroupRole(db, me.id, body.data.groupId!)
      if (!me.isAdmin && role !== 'leader') {
        return reply.code(403).send({ error: 'forbidden' })
      }
    }

    const [created] = await db
      .insert(announcements)
      .values({
        authorId: me.id,
        scope: body.data.scope,
        groupId: body.data.scope === 'group' ? body.data.groupId : null,
        title: body.data.title,
        body: body.data.body,
        pinned: body.data.pinned ?? false,
      })
      .returning()
    return reply.code(201).send(created)
  })

  app.get('/announcements', guard, async (request) => {
    const me = request.currentUser
    const myGroupIds = await getUserGroupIds(db, me.id)

    const visible = or(
      eq(announcements.scope, 'company'),
      myGroupIds.length > 0 ? inArray(announcements.groupId, myGroupIds) : undefined,
    )
    return db
      .select({
        id: announcements.id,
        scope: announcements.scope,
        groupId: announcements.groupId,
        title: announcements.title,
        body: announcements.body,
        pinned: announcements.pinned,
        authorName: users.name,
        createdAt: announcements.createdAt,
        readAt: announcementReads.readAt,
      })
      .from(announcements)
      .innerJoin(users, eq(users.id, announcements.authorId))
      .leftJoin(
        announcementReads,
        and(
          eq(announcementReads.announcementId, announcements.id),
          eq(announcementReads.userId, me.id),
        ),
      )
      .where(visible)
      .orderBy(desc(announcements.pinned), desc(announcements.createdAt))
  })

  app.post('/announcements/:announcementId/read', guard, async (request, reply) => {
    const params = z
      .object({ announcementId: z.string().uuid() })
      .safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_request' })

    const [ann] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, params.data.announcementId))
    if (!ann) return reply.code(404).send({ error: 'not_found' })
    if (ann.scope === 'group') {
      const role = await getGroupRole(db, request.currentUser.id, ann.groupId!)
      if (!request.currentUser.isAdmin && !role) {
        return reply.code(403).send({ error: 'forbidden' })
      }
    }

    await db
      .insert(announcementReads)
      .values({ announcementId: ann.id, userId: request.currentUser.id })
      .onConflictDoNothing()
    return { ok: true }
  })
}
