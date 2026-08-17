import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import * as schema from './schema.js'

export type Db = ReturnType<typeof drizzlePglite<typeof schema>>

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../drizzle',
)

/**
 * DATABASE_URL set → managed PostgreSQL (production).
 * Otherwise → embedded PGlite: on-disk for dev, in-memory for tests.
 */
export async function createDb(
  opts: { url?: string; dataDir?: string; memory?: boolean } = {},
): Promise<Db> {
  if (opts.url) {
    const pool = new pg.Pool({ connectionString: opts.url })
    const db = drizzlePg(pool, { schema })
    await migratePg(db, { migrationsFolder })
    return db as unknown as Db
  }
  const dataDir = opts.dataDir ?? 'data/torras'
  if (!opts.memory) fs.mkdirSync(dataDir, { recursive: true })
  const client = opts.memory ? new PGlite() : new PGlite(dataDir)
  const db = drizzlePglite(client, { schema })
  await migratePglite(db, { migrationsFolder })
  return db
}
