import {
  boolean,
  date,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: boolean('is_admin').notNull().default(false),
  status: text('status', { enum: ['active', 'disabled'] })
    .notNull()
    .default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  // Which promo-calendar pack the group's members see (CN platforms vs US retail).
  promoPack: text('promo_pack', { enum: ['cn', 'us'] }).notNull().default('cn'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const groupMembers = pgTable(
  'group_members',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['leader', 'member'] })
      .notNull()
      .default('member'),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
)

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  done: boolean('done').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  dueDate: date('due_date'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }),
  // ownerId = whose workspace the task lives in (the assignee);
  // createdBy = who created/assigned it; groupId set when assigned via a group.
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  scope: text('scope', { enum: ['company', 'group'] }).notNull(),
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  pinned: boolean('pinned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const announcementReads = pgTable(
  'announcement_reads',
  {
    announcementId: uuid('announcement_id')
      .notNull()
      .references(() => announcements.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.announcementId, t.userId] })],
)

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
