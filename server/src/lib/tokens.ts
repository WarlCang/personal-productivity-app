import { createHash, randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { Db } from '../db/client.js'
import { refreshTokens, type users } from '../db/schema.js'

const REFRESH_TTL_DAYS = 30

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export async function issueTokens(
  app: FastifyInstance,
  db: Db,
  user: typeof users.$inferSelect,
) {
  const accessToken = app.jwt.sign({ sub: user.id }, { expiresIn: '15m' })
  const refreshToken = randomBytes(48).toString('hex')
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
  })
  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin },
  }
}

export async function findActiveRefreshToken(db: Db, token: string) {
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, sha256(token)), isNull(refreshTokens.revokedAt)))
  if (!row || row.expiresAt.getTime() < Date.now()) return null
  return row
}

export async function revokeRefreshToken(db: Db, id: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, id))
}
