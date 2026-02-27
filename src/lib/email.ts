import nodemailer from 'nodemailer';

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
};

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
): Promise<boolean> => {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM ?? 'noreply@vodnistav.cz';

  if (!transporter) {
    console.warn('[email] SMTP env vars nejsou nastavené, email nebyl odeslán:', subject);
    return false;
  }

  await transporter.sendMail({ from, to, subject, html });
  return true;
};
