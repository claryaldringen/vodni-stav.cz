import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/lib/auth/auth';
import { createPayment } from '@/src/lib/payments';
import { generateSpdString } from '@/src/lib/qr';
import type { PaymentPlan } from '@/src/lib/types';

const VALID_PLANS: PaymentPlan[] = ['monthly', 'yearly'];

export const POST = async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const body = await request.json();
  const plan = body.plan as PaymentPlan;

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Neplatný plán.' }, { status: 400 });
  }

  const payment = await createPayment(session.user.id, plan);
  const spdString = generateSpdString(payment.amount, payment.vs);

  return NextResponse.json({
    paymentId: payment.id,
    vs: payment.vs,
    amount: payment.amount,
    spdString,
  }, { status: 201 });
};
