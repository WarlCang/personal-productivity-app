import { beforeAll, describe, expect, it } from 'vitest'
import { auth, buildTestWorld, type TestWorld } from './helpers.js'

let w: TestWorld
let adminToken: string
beforeAll(async () => {
  w = await buildTestWorld()
  adminToken = await w.tokenFor('admin@test.com')
})

describe('admin: invites', () => {
  it('revokes a pending invite so it can no longer be accepted', async () => {
    const created = await w.app.inject({
      method: 'POST',
      url: '/admin/invites',
      headers: auth(adminToken),
      payload: { email: 'revoked@test.com' },
    })
    const { id, token } = created.json()

    const revoke = await w.app.inject({
      method: 'DELETE',
      url: `/admin/invites/${id}`,
      headers: auth(adminToken),
    })
    expect(revoke.statusCode).toBe(200)

    const accept = await w.app.inject({
      method: 'POST',
      url: '/auth/accept-invite',
      payload: { token, name: 'Ghost', password: 'longenough8' },
    })
    expect(accept.statusCode).toBe(400)
  })

  it('cannot revoke an already-accepted invite', async () => {
    const created = await w.app.inject({
      method: 'POST',
      url: '/admin/invites',
      headers: auth(adminToken),
      payload: { email: 'joined@test.com' },
    })
    const { id, token } = created.json()
    await w.app.inject({
      method: 'POST',
      url: '/auth/accept-invite',
      payload: { token, name: 'Joined', password: 'longenough8' },
    })

    const revoke = await w.app.inject({
      method: 'DELETE',
      url: `/admin/invites/${id}`,
      headers: auth(adminToken),
    })
    expect(revoke.statusCode).toBe(409)
  })
})

describe('admin: users', () => {
  it('lists users with their group memberships', async () => {
    const res = await w.app.inject({
      method: 'GET',
      url: '/admin/users',
      headers: auth(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const leader = res.json().find((u: any) => u.email === 'ops.leader@test.com')
    expect(leader.groups).toEqual([
      expect.objectContaining({ name: 'ops', role: 'leader' }),
    ])
  })

  it('promotes a user to admin, granting admin access immediately', async () => {
    const before = await w.app.inject({
      method: 'GET',
      url: '/admin/users',
      headers: auth(await w.tokenFor('design.member@test.com')),
    })
    expect(before.statusCode).toBe(403)

    const promote = await w.app.inject({
      method: 'PATCH',
      url: `/admin/users/${w.ids.designMember}`,
      headers: auth(adminToken),
      payload: { isAdmin: true },
    })
    expect(promote.statusCode).toBe(200)

    const after = await w.app.inject({
      method: 'GET',
      url: '/admin/users',
      headers: auth(await w.tokenFor('design.member@test.com')),
    })
    expect(after.statusCode).toBe(200)
  })

  it('an admin cannot disable or demote themselves', async () => {
    for (const payload of [{ status: 'disabled' }, { isAdmin: false }]) {
      const res = await w.app.inject({
        method: 'PATCH',
        url: `/admin/users/${w.ids.admin}`,
        headers: auth(adminToken),
        payload,
      })
      expect(res.statusCode, JSON.stringify(payload)).toBe(400)
    }
  })
})

describe('admin: groups', () => {
  it('sets a group promo pack, visible to members via /me', async () => {
    const patch = await w.app.inject({
      method: 'PATCH',
      url: `/admin/groups/${w.ids.opsGroup}`,
      headers: auth(adminToken),
      payload: { promoPack: 'us' },
    })
    expect(patch.statusCode).toBe(200)
    expect(patch.json().promoPack).toBe('us')

    const me = await w.app.inject({
      method: 'GET',
      url: '/me',
      headers: auth(await w.tokenFor('ops.member@test.com')),
    })
    expect(me.json().groups[0].promoPack).toBe('us')
  })

  it('renames a group', async () => {
    const res = await w.app.inject({
      method: 'PATCH',
      url: `/admin/groups/${w.ids.designGroup}`,
      headers: auth(adminToken),
      payload: { name: 'design-team' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('design-team')
  })

  it('deletes a group; assigned tasks survive in personal lists without the group', async () => {
    const created = await w.app.inject({
      method: 'POST',
      url: '/admin/groups',
      headers: auth(adminToken),
      payload: { name: 'temp' },
    })
    const groupId = created.json().id
    await w.app.inject({
      method: 'PUT',
      url: `/admin/groups/${groupId}/members/${w.ids.opsMember}`,
      headers: auth(adminToken),
      payload: { role: 'member' },
    })
    const task = await w.app.inject({
      method: 'POST',
      url: `/groups/${groupId}/tasks`,
      headers: auth(adminToken),
      payload: { assigneeId: w.ids.opsMember, title: 'survivor' },
    })
    expect(task.statusCode).toBe(201)

    const del = await w.app.inject({
      method: 'DELETE',
      url: `/admin/groups/${groupId}`,
      headers: auth(adminToken),
    })
    expect(del.statusCode).toBe(200)

    const memberTasks = await w.app.inject({
      method: 'GET',
      url: '/tasks',
      headers: auth(await w.tokenFor('ops.member@test.com')),
    })
    const survivor = memberTasks.json().find((t: any) => t.title === 'survivor')
    expect(survivor).toBeTruthy()
    expect(survivor.groupId).toBeNull()
  })
})
