import { and, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getGroupRole } from '../lib/permissions.js'
import { groupMembers, tasks, users } from '../db/schema.js'

const taskFields = {
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
}
const createTaskSchema = z.object(taskFields)
const assignTaskSchema = z.object({ ...taskFields, assigneeId: z.string().uuid() })
const updateTaskSchema = z
  .object({
    title: taskFields.title.optional(),
    description: z.string().max(10000).nullable().optional(),
    dueDate: taskFields.dueDate.nullable().optional(),
    priority: taskFields.priority.nullable().optional(),
    done: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0)

export async function taskRoutes(app: FastifyInstance) {
  const db = app.db
  const guard = { preHandler: [app.authenticate] }

  app.get('/tasks', guard, async (request) => {
    const assigner = alias(users, 'assigner')
    return db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        done: tasks.done,
        completedAt: tasks.completedAt,
        dueDate: tasks.dueDate,
        priority: tasks.priority,
        groupId: tasks.groupId,
        createdBy: tasks.createdBy,
        createdByName: assigner.name,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .innerJoin(assigner, eq(assigner.id, tasks.createdBy))
      .where(eq(tasks.ownerId, request.currentUser.id))
  })

  app.post('/tasks', guard, async (request, reply) => {
    const body = createTaskSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' })
    const [task] = await db
      .insert(tasks)
      .values({
        ...body.data,
        ownerId: request.currentUser.id,
        createdBy: request.currentUser.id,
      })
      .returning()
    return reply.code(201).send(task)
  })

  // Leaders (or admins) assign a task to a member of the group.
  app.post('/groups/:groupId/tasks', guard, async (request, reply) => {
    const params = z.object({ groupId: z.string().uuid() }).safeParse(request.params)
    const body = assignTaskSchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }
    const me = request.currentUser
    const groupId = params.data.groupId

    const myRole = await getGroupRole(db, me.id, groupId)
    if (!me.isAdmin && myRole !== 'leader') {
      return reply.code(403).send({ error: 'forbidden' })
    }
    const assigneeRole = await getGroupRole(db, body.data.assigneeId, groupId)
    if (!assigneeRole) {
      return reply.code(400).send({ error: 'assignee_not_in_group' })
    }

    const { assigneeId, ...fields } = body.data
    const [task] = await db
      .insert(tasks)
      .values({ ...fields, ownerId: assigneeId, createdBy: me.id, groupId })
      .returning()
    return reply.code(201).send(task)
  })

  // Group task overview for leaders/admins.
  app.get('/groups/:groupId/tasks', guard, async (request, reply) => {
    const params = z.object({ groupId: z.string().uuid() }).safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_request' })
    const me = request.currentUser

    const myRole = await getGroupRole(db, me.id, params.data.groupId)
    if (!me.isAdmin && myRole !== 'leader') {
      return reply.code(403).send({ error: 'forbidden' })
    }
    const assignee = alias(users, 'assignee')
    return db
      .select({
        id: tasks.id,
        title: tasks.title,
        done: tasks.done,
        completedAt: tasks.completedAt,
        dueDate: tasks.dueDate,
        priority: tasks.priority,
        ownerId: tasks.ownerId,
        ownerName: assignee.name,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .innerJoin(assignee, eq(assignee.id, tasks.ownerId))
      .where(eq(tasks.groupId, params.data.groupId))
  })

  app.patch('/tasks/:taskId', guard, async (request, reply) => {
    const params = z.object({ taskId: z.string().uuid() }).safeParse(request.params)
    const body = updateTaskSchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }
    const me = request.currentUser
    const [task] = await db.select().from(tasks).where(eq(tasks.id, params.data.taskId))
    if (!task) return reply.code(404).send({ error: 'not_found' })
    if (task.ownerId !== me.id && task.createdBy !== me.id && !me.isAdmin) {
      return reply.code(403).send({ error: 'forbidden' })
    }

    const changes: Partial<typeof tasks.$inferInsert> = { ...body.data }
    if (body.data.done !== undefined && body.data.done !== task.done) {
      changes.completedAt = body.data.done ? new Date() : null
    }
    const [updated] = await db
      .update(tasks)
      .set(changes)
      .where(eq(tasks.id, task.id))
      .returning()
    return updated
  })

  app.delete('/tasks/:taskId', guard, async (request, reply) => {
    const params = z.object({ taskId: z.string().uuid() }).safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_request' })
    const me = request.currentUser
    const [task] = await db.select().from(tasks).where(eq(tasks.id, params.data.taskId))
    if (!task) return reply.code(404).send({ error: 'not_found' })
    if (task.ownerId !== me.id && task.createdBy !== me.id && !me.isAdmin) {
      return reply.code(403).send({ error: 'forbidden' })
    }
    await db.delete(tasks).where(eq(tasks.id, task.id))
    return { ok: true }
  })

  // Members of a group can see who else is in it.
  app.get('/groups/:groupId/members', guard, async (request, reply) => {
    const params = z.object({ groupId: z.string().uuid() }).safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_request' })
    const me = request.currentUser

    const myRole = await getGroupRole(db, me.id, params.data.groupId)
    if (!me.isAdmin && !myRole) return reply.code(403).send({ error: 'forbidden' })

    return db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: groupMembers.role,
      })
      .from(groupMembers)
      .innerJoin(users, eq(users.id, groupMembers.userId))
      .where(eq(groupMembers.groupId, params.data.groupId))
  })
}
