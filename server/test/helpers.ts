import type { FastifyInstance } from 'fastify'
import { createDb, type Db } from '../src/db/client.js'
import { hashPassword } from '../src/lib/hash.js'
import { groupMembers, groups, users } from '../src/db/schema.js'
import { buildApp } from '../src/app.js'

process.env.LOGIN_RATE_LIMIT = '1000'

export const PASSWORD = 'pass1234'

export interface TestWorld {
  app: FastifyInstance
  db: Db
  ids: {
    admin: string
    opsLeader: string
    opsMember: string
    opsMember2: string
    designLeader: string
    designMember: string
    opsGroup: string
    designGroup: string
  }
  tokenFor: (email: string) => Promise<string>
}

export async function buildTestWorld(): Promise<TestWorld> {
  const db = await createDb({ memory: true })
  const app = await buildApp(db)

  async function createUser(email: string, name: string, isAdmin = false) {
    const [u] = await db
      .insert(users)
      .values({ email, name, passwordHash: hashPassword(PASSWORD), isAdmin })
      .returning()
    return u.id
  }
  async function createGroup(name: string) {
    const [g] = await db.insert(groups).values({ name }).returning()
    return g.id
  }

  const admin = await createUser('admin@test.com', 'Admin', true)
  const opsLeader = await createUser('ops.leader@test.com', 'Ops Leader')
  const opsMember = await createUser('ops.member@test.com', 'Ops Member')
  const opsMember2 = await createUser('ops.member2@test.com', 'Ops Member 2')
  const designLeader = await createUser('design.leader@test.com', 'Design Leader')
  const designMember = await createUser('design.member@test.com', 'Design Member')
  const opsGroup = await createGroup('ops')
  const designGroup = await createGroup('design')

  await db.insert(groupMembers).values([
    { groupId: opsGroup, userId: opsLeader, role: 'leader' },
    { groupId: opsGroup, userId: opsMember, role: 'member' },
    { groupId: opsGroup, userId: opsMember2, role: 'member' },
    { groupId: designGroup, userId: designLeader, role: 'leader' },
    { groupId: designGroup, userId: designMember, role: 'member' },
  ])

  const tokenCache = new Map<string, string>()
  async function tokenFor(email: string): Promise<string> {
    const cached = tokenCache.get(email)
    if (cached) return cached
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: PASSWORD },
    })
    if (res.statusCode !== 200) throw new Error(`login failed for ${email}: ${res.body}`)
    const token = res.json().accessToken as string
    tokenCache.set(email, token)
    return token
  }

  return {
    app,
    db,
    ids: {
      admin,
      opsLeader,
      opsMember,
      opsMember2,
      designLeader,
      designMember,
      opsGroup,
      designGroup,
    },
    tokenFor,
  }
}

export function auth(token: string) {
  return { authorization: `Bearer ${token}` }
}
