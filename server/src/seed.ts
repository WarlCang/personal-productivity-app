/**
 * Seeds the local dev database with an admin, two groups (运营 / 设计),
 * leaders, and members so the role system can be exercised immediately.
 * Run: npm run seed
 */
import { eq } from 'drizzle-orm'
import { createDb } from './db/client.js'
import { hashPassword } from './lib/hash.js'
import { groupMembers, groups, users } from './db/schema.js'

const db = await createDb({ url: process.env.DATABASE_URL })

const PASSWORD = 'torras123'

async function upsertUser(email: string, name: string, isAdmin = false) {
  const [existing] = await db.select().from(users).where(eq(users.email, email))
  if (existing) return existing
  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash: hashPassword(PASSWORD), isAdmin })
    .returning()
  return user
}

async function upsertGroup(name: string) {
  const [existing] = await db.select().from(groups).where(eq(groups.name, name))
  if (existing) return existing
  const [group] = await db.insert(groups).values({ name }).returning()
  return group
}

const admin = await upsertUser('admin@torras.com', '管理员', true)
const opsLeader = await upsertUser('ops.leader@torras.com', '运营组长')
const opsMember1 = await upsertUser('ops.a@torras.com', '运营成员A')
const opsMember2 = await upsertUser('ops.b@torras.com', '运营成员B')
const designLeader = await upsertUser('design.leader@torras.com', '设计组长')
const designMember = await upsertUser('design.a@torras.com', '设计成员A')

const ops = await upsertGroup('运营')
const design = await upsertGroup('设计')

await db
  .insert(groupMembers)
  .values([
    { groupId: ops.id, userId: opsLeader.id, role: 'leader' },
    { groupId: ops.id, userId: opsMember1.id, role: 'member' },
    { groupId: ops.id, userId: opsMember2.id, role: 'member' },
    { groupId: design.id, userId: designLeader.id, role: 'leader' },
    { groupId: design.id, userId: designMember.id, role: 'member' },
  ])
  .onConflictDoNothing()

console.log(`Seeded. All passwords: ${PASSWORD}
  admin            admin@torras.com         (管理员, is_admin)
  运营 leader      ops.leader@torras.com
  运营 members     ops.a@torras.com, ops.b@torras.com
  设计 leader      design.leader@torras.com
  设计 member      design.a@torras.com`)
console.log(`admin user id: ${admin.id}`)
process.exit(0)
