import type { Adapter, AdapterUser, AdapterAccount, AdapterSession } from '@auth/core/adapters';
import type { VerificationToken } from '@auth/core/adapters';
import { connectDb } from '../db';

const mapUser = (row: Record<string, unknown>): AdapterUser => ({
  id: row.id as string,
  name: (row.name as string) ?? null,
  email: row.email as string,
  emailVerified: row.emailVerified ? new Date(row.emailVerified as string) : null,
  image: (row.image as string) ?? null,
});

export const PostgresAdapter = (): Adapter => ({
  async createUser(user) {
    const sql = await connectDb();
    const id = crypto.randomUUID();
    const rows = await sql`
      INSERT INTO "user" (id, name, email, "emailVerified", image)
      VALUES (${id}, ${user.name ?? null}, ${user.email}, ${user.emailVerified?.toISOString() ?? null}, ${user.image ?? null})
      RETURNING id, name, email, "emailVerified", image
    `;
    return mapUser(rows[0]);
  },

  async getUser(id) {
    const sql = await connectDb();
    const rows = await sql`SELECT id, name, email, "emailVerified", image FROM "user" WHERE id = ${id}`;
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async getUserByEmail(email) {
    const sql = await connectDb();
    const rows = await sql`SELECT id, name, email, "emailVerified", image FROM "user" WHERE email = ${email}`;
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async getUserByAccount({ providerAccountId, provider }) {
    const sql = await connectDb();
    const rows = await sql`
      SELECT u.id, u.name, u.email, u."emailVerified", u.image
      FROM "user" u
      JOIN account a ON a."userId" = u.id
      WHERE a.provider = ${provider} AND a."providerAccountId" = ${providerAccountId}
    `;
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async updateUser(user) {
    const sql = await connectDb();
    const rows = await sql`
      UPDATE "user"
      SET name = COALESCE(${user.name ?? null}, name),
          email = COALESCE(${user.email ?? null}, email),
          "emailVerified" = COALESCE(${user.emailVerified?.toISOString() ?? null}, "emailVerified"),
          image = COALESCE(${user.image ?? null}, image),
          updated_at = NOW()
      WHERE id = ${user.id!}
      RETURNING id, name, email, "emailVerified", image
    `;
    return mapUser(rows[0]);
  },

  async deleteUser(userId) {
    const sql = await connectDb();
    await sql`DELETE FROM "user" WHERE id = ${userId}`;
  },

  async linkAccount(account) {
    const sql = await connectDb();
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO account (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
      VALUES (${id}, ${account.userId}, ${account.type}, ${account.provider}, ${account.providerAccountId}, ${account.refresh_token ?? null}, ${account.access_token ?? null}, ${account.expires_at ?? null}, ${account.token_type ?? null}, ${account.scope ?? null}, ${account.id_token ?? null}, ${(account.session_state as string) ?? null})
    `;
    return account as AdapterAccount;
  },

  async unlinkAccount({ providerAccountId, provider }) {
    const sql = await connectDb();
    await sql`DELETE FROM account WHERE provider = ${provider} AND "providerAccountId" = ${providerAccountId}`;
  },

  async createSession(session) {
    const sql = await connectDb();
    const id = crypto.randomUUID();
    const rows = await sql`
      INSERT INTO session (id, "sessionToken", "userId", expires)
      VALUES (${id}, ${session.sessionToken}, ${session.userId}, ${session.expires.toISOString()})
      RETURNING id, "sessionToken", "userId", expires
    `;
    return rows[0] as AdapterSession;
  },

  async getSessionAndUser(sessionToken) {
    const sql = await connectDb();
    const rows = await sql`
      SELECT s."sessionToken", s."userId", s.expires,
             u.id, u.name, u.email, u."emailVerified", u.image
      FROM session s
      JOIN "user" u ON u.id = s."userId"
      WHERE s."sessionToken" = ${sessionToken}
        AND s.expires > NOW()
    `;
    if (!rows[0]) return null;
    const row = rows[0];
    return {
      session: {
        sessionToken: row.sessionToken as string,
        userId: row.userId as string,
        expires: new Date(row.expires as string),
      },
      user: mapUser(row),
    };
  },

  async updateSession(session) {
    const sql = await connectDb();
    const rows = await sql`
      UPDATE session
      SET expires = COALESCE(${session.expires?.toISOString() ?? null}, expires)
      WHERE "sessionToken" = ${session.sessionToken}
      RETURNING "sessionToken", "userId", expires
    `;
    return rows[0] as AdapterSession;
  },

  async deleteSession(sessionToken) {
    const sql = await connectDb();
    await sql`DELETE FROM session WHERE "sessionToken" = ${sessionToken}`;
  },

  async createVerificationToken(token) {
    const sql = await connectDb();
    const rows = await sql`
      INSERT INTO verification_token (identifier, token, expires)
      VALUES (${token.identifier}, ${token.token}, ${token.expires.toISOString()})
      RETURNING identifier, token, expires
    `;
    return rows[0] as VerificationToken;
  },

  async useVerificationToken({ identifier, token }) {
    const sql = await connectDb();
    const rows = await sql`
      DELETE FROM verification_token
      WHERE identifier = ${identifier} AND token = ${token}
      RETURNING identifier, token, expires
    `;
    return rows[0] ? (rows[0] as VerificationToken) : null;
  },
});
