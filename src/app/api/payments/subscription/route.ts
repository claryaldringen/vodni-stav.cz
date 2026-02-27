import { NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth/auth';
import { getActiveSubscription } from '@/src/lib/payments';

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const subscription = await getActiveSubscription(session.user.id);

  if (!subscription) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json(subscription);
};
