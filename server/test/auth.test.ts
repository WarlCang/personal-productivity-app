import { beforeAll, describe, expect, it } from 'vitest'
import { auth, buildTestWorld, PASSWORD, type TestWorld } from './helpers.js'

let w: TestWorld
beforeAll(async () => {
  w = await buildTestWorld()
})

describe('auth', () => {
  it('logs in with correct credentials', async () => {
    const res = await w.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ops.member@test.com', password: PASSWORD },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.accessToken).toBeTruthy()
    expect(body.refreshToken).toBeTruthy()
    expect(body.user.email).toBe('ops.member@test.com')
  })

  it('rejects a wrong password', async () => {
    const res = await w.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ops.member@test.com', password: 'wrong-password' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejects unauthenticated access to protected routes', async () => {
    const res = await w.app.inject({ method: 'GET', url: '/me' })
    expect(res.statusCode).toBe(401)
  })

  it('returns profile with group roles on /me', async () => {
    const res = await w.app.inject({
      method: 'GET',
      url: '/me',
      headers: auth(await w.tokenFor('ops.leader@test.com')),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.isAdmin).toBe(false)
    expect(body.groups).toEqual([
      expect.objectContaining({ name: 'ops', role: 'leader' }),
    ])
  })

  it('rotates refresh tokens: old token is rejected after use', async () => {
    const login = await w.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'design.member@test.com', password: PASSWORD },
    })
    const { refreshToken } = login.json()

    const refresh1 = await w.app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    })
    expect(refresh1.statusCode).toBe(200)
    expect(refresh1.json().refreshToken).not.toBe(refreshToken)

    const replay = await w.app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    })
    expect(replay.statusCode).toBe(401)
  })

  it('full invite flow: admin invites, invitee sets password, then logs in', async () => {
    const adminToken = await w.tokenFor('admin@test.com')
    const invite = await w.app.inject({
      method: 'POST',
      url: '/admin/invites',
      headers: auth(adminToken),
      payload: { email: 'newhire@test.com' },
    })
    expect(invite.statusCode).toBe(201)
    const { token } = invite.json()

    const accept = await w.app.inject({
      method: 'POST',
      url: '/auth/accept-invite',
      payload: { token, name: 'New Hire', password: 'longenough8' },
    })
    expect(accept.statusCode).toBe(201)

    const reuse = await w.app.inject({
      method: 'POST',
      url: '/auth/accept-invite',
      payload: { token, name: 'Imposter', password: 'longenough8' },
    })
    expect(reuse.statusCode).toBe(400)

    const login = await w.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'newhire@test.com', password: 'longenough8' },
    })
    expect(login.statusCode).toBe(200)
  })

  it('rejects an invalid invite token', async () => {
    const res = await w.app.inject({
      method: 'POST',
      url: '/auth/accept-invite',
      payload: { token: 'no-such-token', name: 'X', password: 'longenough8' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('blocks disabled users from logging in', async () => {
    const adminToken = await w.tokenFor('admin@test.com')
    const disable = await w.app.inject({
      method: 'PATCH',
      url: `/admin/users/${w.ids.opsMember2}`,
      headers: auth(adminToken),
      payload: { status: 'disabled' },
    })
    expect(disable.statusCode).toBe(200)

    const login = await w.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ops.member2@test.com', password: PASSWORD },
    })
    expect(login.statusCode).toBe(403)
  })
})
