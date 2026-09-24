import nodemailer from 'nodemailer';
import {
  adminEmail,
  assertConfigured,
  clientIp,
  cookie,
  getCookie,
  hashOtp,
  randomNonce,
  randomOtp,
  signToken,
  verifyToken
} from './_security.js';

const memoryRateLimit = globalThis.__otpRateLimit || new Map();
globalThis.__otpRateLimit = memoryRateLimit;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    assertConfigured();

    const cooldown = verifyToken(getCookie(req, 'otp_cooldown'));
    if (cooldown) return res.status(429).json({ error: 'Please wait before requesting another OTP.' });

    const ip = clientIp(req);
    const last = memoryRateLimit.get(ip) || 0;
    if (Date.now() - last < 60_000) {
      return res.status(429).json({ error: 'Please wait before requesting another OTP.' });
    }
    memoryRateLimit.set(ip, Date.now());

    const otp = randomOtp();
    const nonce = randomNonce();
    const exp = Date.now() + 10 * 60 * 1000;
    const challenge = signToken({
      role: 'otp-challenge',
      nonce,
      exp,
      hash: hashOtp(otp, nonce, exp),
      attempts: 0
    });
    const cooldownToken = signToken({ role: 'otp-cooldown', exp: Date.now() + 60_000 });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `Landslide Research Admin <${process.env.GMAIL_USER}>`,
      to: adminEmail(),
      subject: 'Your document manager OTP',
      text: `Your OTP is ${otp}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#132238">
          <h2 style="margin:0 0 10px;color:#07182d">Document Manager Verification</h2>
          <p>Use this one-time code to access the IoT Landslide project file manager:</p>
          <div style="font-size:34px;letter-spacing:8px;font-weight:800;background:#f6f8fb;padding:18px 22px;border-radius:12px;text-align:center;color:#07182d">${otp}</div>
          <p style="color:#5f6f83">This code expires in 10 minutes.</p>
        </div>`
    });

    res.setHeader('Set-Cookie', [
      cookie('otp_challenge', challenge, 10 * 60),
      cookie('otp_cooldown', cooldownToken, 60)
    ]);
    return res.status(200).json({ ok: true, message: 'OTP sent to the configured administrator email.' });
  } catch (error) {
    console.error('send-otp error', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to send OTP.' });
  }
}
