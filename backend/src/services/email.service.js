import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

function createTransport() {
  if (process.env.NODE_ENV === 'test') {
    // Ethereal test account — emails are captured, not delivered
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const transporter = createTransport();

const FROM = process.env.EMAIL_FROM || '"AI Widget" <noreply@ai-widget.app>';

async function send({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, html, text });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    // Log but don't crash — email failure should not block the API response
    logger.error(`Failed to send email to ${to}: ${err.message}`);
    throw err;
  }
}

// ── Email templates ──────────────────────────────────────────

export async function sendPasswordResetEmail(email, resetUrl) {
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0ea5e9;">Reset your password</h2>
      <p>You requested a password reset for your AI Widget account.</p>
      <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}"
         style="display: inline-block; background: #0ea5e9; color: #fff; padding: 12px 24px;
                border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
        Reset Password
      </a>
      <p style="color: #6b7280; font-size: 14px;">
        If you didn't request this, you can safely ignore this email.
        Your password will not change.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="color: #9ca3af; font-size: 12px;">AI Widget · Secure Customer Support Platform</p>
    </div>
  `;

  return send({
    to: email,
    subject: 'Reset your AI Widget password',
    html,
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });
}

export async function sendEmailVerification(email, verifyUrl, name) {
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0ea5e9;">Welcome to AI Widget, ${name}!</h2>
      <p>Please verify your email address to activate your account.</p>
      <a href="${verifyUrl}"
         style="display: inline-block; background: #0ea5e9; color: #fff; padding: 12px 24px;
                border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
        Verify Email
      </a>
      <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours.</p>
    </div>
  `;

  return send({
    to: email,
    subject: 'Verify your AI Widget email',
    html,
    text: `Verify your email: ${verifyUrl}`,
  });
}

export async function sendWelcomeEmail(email, name) {
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0ea5e9;">You're all set, ${name}!</h2>
      <p>Your AI Widget account is ready. Here's how to get started:</p>
      <ol style="line-height: 2;">
        <li>Upload your company documents</li>
        <li>Copy your widget embed code</li>
        <li>Paste it into your website</li>
      </ol>
      <p>Your customers can now get instant AI-powered answers from your knowledge base.</p>
    </div>
  `;

  return send({
    to: email,
    subject: 'Welcome to AI Widget — you\'re ready to go!',
    html,
    text: `Welcome ${name}! Your AI Widget account is ready.`,
  });
}

export async function sendChatTranscript(email, messages, companyName) {
  const messageLines = messages
    .map((m) => `${m.role === 'user' ? 'You' : companyName}: ${m.content}`)
    .join('\n\n');

  const htmlMessages = messages
    .map(
      (m) => `
      <div style="margin-bottom: 16px;">
        <strong style="color: ${m.role === 'user' ? '#374151' : '#0ea5e9'};">
          ${m.role === 'user' ? 'You' : companyName}
        </strong>
        <p style="margin: 4px 0; color: #4b5563;">${m.content}</p>
      </div>`
    )
    .join('');

  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0ea5e9;">Your chat transcript</h2>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
        ${htmlMessages}
      </div>
    </div>
  `;

  return send({
    to: email,
    subject: `Your chat with ${companyName}`,
    html,
    text: messageLines,
  });
}
