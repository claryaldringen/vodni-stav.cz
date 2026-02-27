import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth/auth';
import { revokeApiKey } from '@/src/lib/auth/api-key';

export const DELETE = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const { id } = await params;
  const keyId = Number(id);
  if (Number.isNaN(keyId)) {
    return NextResponse.json({ error: 'Neplatné ID.' }, { status: 400 });
  }

  const revoked = await revokeApiKey(keyId, session.user.id);
  if (!revoked) {
    return NextResponse.json({ error: 'Klíč nenalezen.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
};
