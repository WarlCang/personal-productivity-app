import type { Db } from './db/client.js'
import type { users } from './db/schema.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    currentUser: typeof users.$inferSelect
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string }
    user: { sub: string }
  }
}
