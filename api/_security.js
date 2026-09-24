import crypto from 'node:crypto';

const isProduction = Boolean(process.env.VERCEL);
const secret = () => process.env.OTP_SECRET || '';

export function assertConfigured() {
  const missing = [];
  if (!process.env.GMAIL_USER) missing.push('GMAIL_USER');
  if (!process.env.GMAIL_APP_PASSWORD) missing.push('GMAIL_APP_PASSWORD');
  if (!secret() || secret().length < 32) missing.push('OTP_SECRET (minimum 32 characters)');
  if (missing.length) {
    const error = new Error(`Missing environment variables: ${missing.join(', ')}`);
    error.statusCode = 503;
    throw error;
  }
}

export function adminEmail() {
  return process.env.ADMIN_EMAIL || 'kamkanamlage394@gmail.com';
}

function hmac(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(body)}`;
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = hmac(body);
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashOtp(otp, nonce, exp) {
  return hmac(`${otp}|${nonce}|${exp}`);
}

export function randomOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export function randomNonce() {
  return crypto.randomBytes(18).toString('base64url');
}

export function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function cookie(name, value, maxAgeSeconds) {
  const bits = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`
  ];
  if (isProduction) bits.push('Secure');
  return bits.join('; ');
}

export function clearCookie(name) {
  return cookie(name, '', 0);
}

export function requireAdmin(req) {
  if (!secret() || secret().length < 32) return null;
  const token = getCookie(req, 'admin_session');
  const payload = verifyToken(token);
  return payload?.role === 'admin' ? payload : null;
}

export function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
}
