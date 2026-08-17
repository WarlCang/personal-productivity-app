import { and, eq } from 'drizzle-orm'
import type { Db } from '../db/client.js'
import { groupMembers } from '../db/schema.js'

export type GroupRole = 'leader' | 'member' | null

export async function getGroupRole(
  db: Db,
  userId: string,
  groupId: string,
): Promise<GroupRole> {
  const [row] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
  return row?.role ?? null
}

export async function getUserGroupIds(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId))
  return rows.map((r) => r.groupId)
}
