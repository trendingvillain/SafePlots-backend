const nodemailer = require('nodemailer');
const config = require('../config/config');

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: Number(config.email.port),
  secure: Number(config.email.port) === 465, // ✅ auto-fix secure flag
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

/**
 * ✅ Verify SMTP once on startup
 */
transporter.verify((error) => {
  if (error) {
    console.error('SMTP VERIFY FAILED ❌', error.message);
  } else {
    console.log('SMTP READY ✅');
  }
});

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: config.email.from || `SafePlots <${config.email.user}>`, // ✅ safe fallback
      to,
      subject,
      html,
      text,
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed ❌', {
      message: error.message,
      code: error.code,
      command: error.command,
    });
    throw new Error('Failed to send email');
  }
};

const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  const subject =
    purpose === 'registration'
      ? 'Verify Your Email - SafePlots'
      : 'Password Reset OTP - SafePlots';

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <h2>SafePlots</h2>
      <p>Your OTP for <strong>${purpose}</strong> is:</p>
      <h1 style="letter-spacing:6px;">${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you did not request this, ignore this email.</p>
    </body>
    </html>
  `;

  const text = `Your SafePlots OTP is ${otp}. This code expires in 10 minutes.`;

  return sendEmail({ to: email, subject, html, text });
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${config.frontend.url}/reset-password?token=${resetToken}`;

  const html = `
    <h2>SafePlots Password Reset</h2>
    <p>Click below to reset your password:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>This link expires in 1 hour.</p>
  `;

  const text = `Reset your SafePlots password: ${resetUrl}`;

  return sendEmail({
    to: email,
    subject: 'Password Reset Request - SafePlots',
    html,
    text,
  });
};

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
};
