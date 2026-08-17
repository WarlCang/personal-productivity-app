import { createDb } from './db/client.js'
import { buildApp } from './app.js'

const db = await createDb({ url: process.env.DATABASE_URL })
const app = await buildApp(db, { logger: true })

const port = Number(process.env.PORT ?? 4000)
await app.listen({ port, host: process.env.HOST ?? '127.0.0.1' })
