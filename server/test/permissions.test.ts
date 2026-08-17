import { beforeAll, describe, expect, it } from 'vitest'
import { auth, buildTestWorld, type TestWorld } from './helpers.js'

let w: TestWorld
beforeAll(async () => {
  w = await buildTestWorld()
})

async function assignTask(token: string, groupId: string, assigneeId: string) {
  return w.app.inject({
    method: 'POST',
    url: `/groups/${groupId}/tasks`,
    headers: auth(token),
    payload: { title: '写周报', assigneeId },
  })
}

describe('task assignment', () => {
  it('members cannot assign tasks in their group', async () => {
    const res = await assignTask(
      await w.tokenFor('ops.member@test.com'),
      w.ids.opsGroup,
      w.ids.opsMember2,
    )
    expect(res.statusCode).toBe(403)
  })

  it('leaders can assign tasks to their own group members, and the task lands in the assignee todo list', async () => {
    const res = await assignTask(
      await w.tokenFor('ops.leader@test.com'),
      w.ids.opsGroup,
      w.ids.opsMember,
    )
    expect(res.statusCode).toBe(201)

    const memberTasks = await w.app.inject({
      method: 'GET',
      url: '/tasks',
      headers: auth(await w.tokenFor('ops.member@test.com')),
    })
    const assigned = memberTasks.json().find((t: any) => t.title === '写周报')
    expect(assigned).toBeTruthy()
    expect(assigned.createdByName).toBe('Ops Leader')
  })

  it('leaders cannot assign tasks in a group they do not lead', async () => {
    const res = await assignTask(
      await w.tokenFor('design.leader@test.com'),
      w.ids.opsGroup,
      w.ids.opsMember,
    )
    expect(res.statusCode).toBe(403)
  })

  it('leaders cannot assign tasks to someone outside the group', async () => {
    const res = await assignTask(
      await w.tokenFor('ops.leader@test.com'),
      w.ids.opsGroup,
      w.ids.designMember,
    )
    expect(res.statusCode).toBe(400)
  })

  it('admins can assign tasks in any group', async () => {
    const res = await assignTask(
      await w.tokenFor('admin@test.com'),
      w.ids.designGroup,
      w.ids.designMember,
    )
    expect(res.statusCode).toBe(201)
  })

  it('the assignee can complete the task; an unrelated user cannot touch it', async () => {
    const created = await assignTask(
      await w.tokenFor('ops.leader@test.com'),
      w.ids.opsGroup,
      w.ids.opsMember,
    )
    const taskId = created.json().id

    const intruder = await w.app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: auth(await w.tokenFor('design.member@test.com')),
      payload: { done: true },
    })
    expect(intruder.statusCode).toBe(403)

    const complete = await w.app.inject({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      headers: auth(await w.tokenFor('ops.member@test.com')),
      payload: { done: true },
    })
    expect(complete.statusCode).toBe(200)
    expect(complete.json().done).toBe(true)
    expect(complete.json().completedAt).toBeTruthy()
  })
})

describe('group overview', () => {
  it('members cannot see the group task overview', async () => {
    const res = await w.app.inject({
      method: 'GET',
      url: `/groups/${w.ids.opsGroup}/tasks`,
      headers: auth(await w.tokenFor('ops.member@test.com')),
    })
    expect(res.statusCode).toBe(403)
  })

  it('leaders see their group task overview with assignee names', async () => {
    const res = await w.app.inject({
      method: 'GET',
      url: `/groups/${w.ids.opsGroup}/tasks`,
      headers: auth(await w.tokenFor('ops.leader@test.com')),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBeGreaterThan(0)
    expect(res.json()[0].ownerName).toBeTruthy()
  })

  it('outsiders cannot list members of a group they are not in', async () => {
    const res = await w.app.inject({
      method: 'GET',
      url: `/groups/${w.ids.designGroup}/members`,
      headers: auth(await w.tokenFor('ops.member@test.com')),
    })
    expect(res.statusCode).toBe(403)
  })
})

describe('announcements', () => {
  it('members cannot post group announcements', async () => {
    const res = await w.app.inject({
      method: 'POST',
      url: '/announcements',
      headers: auth(await w.tokenFor('ops.member@test.com')),
      payload: { scope: 'group', groupId: w.ids.opsGroup, title: 'x', body: 'y' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('leaders can post to their group but not company-wide', async () => {
    const token = await w.tokenFor('ops.leader@test.com')
    const groupPost = await w.app.inject({
      method: 'POST',
      url: '/announcements',
      headers: auth(token),
      payload: { scope: 'group', groupId: w.ids.opsGroup, title: '组内通知', body: '…' },
    })
    expect(groupPost.statusCode).toBe(201)

    const companyPost = await w.app.inject({
      method: 'POST',
      url: '/announcements',
      headers: auth(token),
      payload: { scope: 'company', title: '全员通知', body: '…' },
    })
    expect(companyPost.statusCode).toBe(403)
  })

  it('admins can post company-wide', async () => {
    const res = await w.app.inject({
      method: 'POST',
      url: '/announcements',
      headers: auth(await w.tokenFor('admin@test.com')),
      payload: { scope: 'company', title: '全员通知', body: '…' },
    })
    expect(res.statusCode).toBe(201)
  })

  it('feed shows company plus own-group announcements only', async () => {
    const res = await w.app.inject({
      method: 'GET',
      url: '/announcements',
      headers: auth(await w.tokenFor('design.member@test.com')),
    })
    expect(res.statusCode).toBe(200)
    const feed = res.json()
    expect(feed.some((a: any) => a.scope === 'company')).toBe(true)
    expect(feed.some((a: any) => a.groupId === w.ids.opsGroup)).toBe(false)
  })
})

describe('admin console', () => {
  it('non-admins cannot create groups or invites or list users', async () => {
    const token = await w.tokenFor('ops.leader@test.com')
    for (const [method, url, payload] of [
      ['POST', '/admin/groups', { name: 'hack' }],
      ['POST', '/admin/invites', { email: 'x@test.com' }],
      ['GET', '/admin/users', undefined],
    ] as const) {
      const res = await w.app.inject({ method, url, headers: auth(token), payload })
      expect(res.statusCode, `${method} ${url}`).toBe(403)
    }
  })

  it('role changes apply immediately: promoted member can assign tasks', async () => {
    const adminToken = await w.tokenFor('admin@test.com')

    const before = await assignTask(
      await w.tokenFor('ops.member2@test.com'),
      w.ids.opsGroup,
      w.ids.opsMember,
    )
    expect(before.statusCode).toBe(403)

    const promote = await w.app.inject({
      method: 'PUT',
      url: `/admin/groups/${w.ids.opsGroup}/members/${w.ids.opsMember2}`,
      headers: auth(adminToken),
      payload: { role: 'leader' },
    })
    expect(promote.statusCode).toBe(200)

    const after = await assignTask(
      await w.tokenFor('ops.member2@test.com'),
      w.ids.opsGroup,
      w.ids.opsMember,
    )
    expect(after.statusCode).toBe(201)
  })
})
