import crypto from 'crypto';

const HMAC_KEY = Buffer.from(process.env.HMAC_KEY, 'hex'); // 32-byte

export function makeStateCookie(res) {
  const state = crypto.randomUUID();
  const sig = crypto.createHmac('sha256', HMAC_KEY).update(state).digest('hex');
  // cookie = {state}.{sig}
  res.cookie('oauth_state', `${state}.${sig}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, // 10 phút
  });
  return state;
}

export function verifyStateCookie(req, providedState) {
  const cookie = req.cookies.oauth_state;
  if (!cookie) return false;
  const [state, sig] = cookie.split('.');
  const validSig = crypto
    .createHmac('sha256', HMAC_KEY)
    .update(state)
    .digest('hex');
  return (
    crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(validSig, 'hex')
    ) && state === providedState
  );
}
