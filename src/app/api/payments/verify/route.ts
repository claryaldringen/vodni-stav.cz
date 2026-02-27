import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth/auth';
import { activatePayment, getLatestPendingPayment } from '@/src/lib/payments';
import { findPaymentInFio, RateLimitError, getRemainingCooldownMs } from '@/src/lib/fio';

export const POST = async (_request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const payment = await getLatestPendingPayment(session.user.id);
  if (!payment) {
    return NextResponse.json({ error: 'Žádná čekající platba.' }, { status: 404 });
  }

  try {
    const fioTxId = await findPaymentInFio(payment.vs, payment.amount);

    if (fioTxId) {
      await activatePayment(payment.id, fioTxId);
      return NextResponse.json({ status: 'paid' });
    }

    return NextResponse.json({ status: 'not_found' });
  } catch (err) {
    if (err instanceof RateLimitError) {
      const remainingMs = await getRemainingCooldownMs();
      return NextResponse.json(
        { error: 'Příliš mnoho pokusů.', remainingMs },
        { status: 429 },
      );
    }
    throw err;
  }
};
