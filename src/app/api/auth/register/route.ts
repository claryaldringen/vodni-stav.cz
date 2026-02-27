import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { connectDb } from '@/src/lib/db';

export const POST = async (request: NextRequest) => {
  const body = await request.json();
  const { name, email, password } = body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email a heslo jsou povinné.' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Heslo musí mít alespoň 8 znaků.' }, { status: 400 });
  }

  const sql = await connectDb();

  const existing = await sql`SELECT id FROM "user" WHERE email = ${email}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Uživatel s tímto emailem již existuje.' }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  const id = crypto.randomUUID();

  await sql`
    INSERT INTO "user" (id, name, email, password_hash)
    VALUES (${id}, ${name ?? null}, ${email}, ${passwordHash})
  `;

  return NextResponse.json({ success: true }, { status: 201 });
};
