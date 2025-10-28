const nodemailer = require('nodemailer');
require('dotenv').config();

async function run() {
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    const info = await t.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_FROM.split('<').pop().replace('>','') || process.env.SMTP_USER,
      subject: 'FranceParts SMTP test',
      text: 'This is a test from nodemailer via SendGrid SMTP.',
    });
    console.log('Sent OK:', info);
  } catch (err) {
    console.error('Send failed:', err);
  }
}
run();