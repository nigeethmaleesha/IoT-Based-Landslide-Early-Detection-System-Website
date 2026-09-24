import { assertConfigured, clearCookie, cookie, getCookie, hashOtp, signToken, verifyToken } from './_security.js';

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');

  try {
    assertConfigured();

    const otp = String(req.body?.otp || '').trim();
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'Enter the 6-digit OTP.' });

    const challenge = verifyToken(getCookie(req, 'otp_challenge'));
    if (!challenge || challenge.role !== 'otp-challenge') {
      return res.status(401).json({ error: 'OTP session expired. Request a new code.' });
    }

    const attempts = Number(challenge.attempts || 0);
    if (attempts >= 5) {
      res.setHeader('Set-Cookie', clearCookie('otp_challenge'));
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new OTP.' });
    }

    const calculated = hashOtp(otp, challenge.nonce, challenge.exp);
    if (!safeEqual(calculated, challenge.hash)) {
      const nextAttempts = attempts + 1;
      if (nextAttempts >= 5) {
        res.setHeader('Set-Cookie', clearCookie('otp_challenge'));
        return res.status(429).json({ error: 'Too many incorrect attempts. Request a new OTP.' });
      }

      const refreshedChallenge = signToken({ ...challenge, attempts: nextAttempts });
      const secondsLeft = Math.max(1, Math.ceil((challenge.exp - Date.now()) / 1000));
      res.setHeader('Set-Cookie', cookie('otp_challenge', refreshedChallenge, secondsLeft));
      return res.status(401).json({ error: `Incorrect OTP. ${5 - nextAttempts} attempt${5 - nextAttempts === 1 ? '' : 's'} remaining.` });
    }

    const session = signToken({ role: 'admin', exp: Date.now() + 30 * 60 * 1000 });
    res.setHeader('Set-Cookie', [
      cookie('admin_session', session, 30 * 60),
      clearCookie('otp_challenge')
    ]);
    return res.status(200).json({ ok: true, message: 'Verified successfully.' });
  } catch (error) {
    console.error('verify-otp error', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to verify OTP.' });
  }
}
