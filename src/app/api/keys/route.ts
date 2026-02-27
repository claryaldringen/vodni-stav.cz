import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth/auth';
import { createApiKeyForUser, listApiKeys } from '@/src/lib/auth/api-key';

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const keys = await listApiKeys(session.user.id);
  return NextResponse.json({ keys });
};

export const POST = async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const body = await request.json();
  const name = (body.name as string)?.trim();
  if (!name) {
    return NextResponse.json({ error: 'Název je povinný.' }, { status: 400 });
  }

  const mode = body.mode === 'live' ? 'live' : 'test';

  const result = await createApiKeyForUser(session.user.id, name, mode);
  return NextResponse.json({
    id: result.id,
    name: result.name,
    key_prefix: result.key_prefix,
    fullKey: result.fullKey,
    created_at: result.created_at,
  }, { status: 201 });
};
