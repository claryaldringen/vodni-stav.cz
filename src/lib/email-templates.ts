import type { PaymentPlan } from './types';

const PLAN_NAMES: Record<PaymentPlan, string> = {
  monthly: 'měsíční',
  yearly: 'roční',
};

const layout = (body: string) => `
<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${body}
  <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #888;">
    Tento email byl odeslán z <a href="https://vodnistav.cz">vodnistav.cz</a>.
  </p>
</body>
</html>
`;

export const expirationWarningEmail = (
  name: string,
  plan: PaymentPlan,
  expiresAt: Date,
  daysLeft: number,
) => ({
  subject: `Vaše předplatné vyprší za ${daysLeft} ${daysLeft === 1 ? 'den' : daysLeft < 5 ? 'dny' : 'dní'}`,
  html: layout(`
    <h2>Dobrý den${name ? `, ${name}` : ''},</h2>
    <p>
      vaše <strong>${PLAN_NAMES[plan]}</strong> předplatné na vodnistav.cz vyprší
      <strong>${expiresAt.toLocaleDateString('cs')}</strong> (za ${daysLeft} ${daysLeft === 1 ? 'den' : daysLeft < 5 ? 'dny' : 'dní'}).
    </p>
    <p>
      Po vypršení budou vaše API klíče přepnuty do testovacího režimu.
      Pro pokračování v plném přístupu prosím obnovte předplatné na
      <a href="https://vodnistav.cz/ucet">svém účtu</a>.
    </p>
  `),
});

export const expiredEmail = (name: string, plan: PaymentPlan) => ({
  subject: 'Vaše předplatné vypršelo',
  html: layout(`
    <h2>Dobrý den${name ? `, ${name}` : ''},</h2>
    <p>
      vaše <strong>${PLAN_NAMES[plan]}</strong> předplatné na vodnistav.cz právě vypršelo.
      Vaše API klíče nyní fungují v testovacím režimu.
    </p>
    <p>
      Pro obnovení plného přístupu k reálným datům prosím obnovte předplatné na
      <a href="https://vodnistav.cz/ucet">svém účtu</a>.
    </p>
  `),
});
