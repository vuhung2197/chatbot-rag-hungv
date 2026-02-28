import crypto from 'crypto';

// Generate a default HMAC_KEY if not provided (for development only)
const getHmacKey = () => {
  if (process.env.HMAC_KEY) {
    try {
      return Buffer.from(process.env.HMAC_KEY, 'hex');
    } catch (e) {
      console.warn('⚠️ Invalid HMAC_KEY format, using default (not secure for production)');
    }
  }
  // Default key for development (32 bytes)
  return Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
};

const HMAC_KEY = getHmacKey();

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
  console.log('🍪 OAuth state cookie set:', { state: `${state.substring(0, 8)  }...` });
  return state;
}

export function verifyStateCookie(req, providedState) {
  const cookie = req.cookies.oauth_state;
  if (!cookie) {
    console.error('❌ No oauth_state cookie found');
    return false;
  }
  
  const parts = cookie.split('.');
  if (parts.length !== 2) {
    console.error('❌ Invalid oauth_state cookie format');
    return false;
  }
  
  const [state, sig] = parts;
  const validSig = crypto
    .createHmac('sha256', HMAC_KEY)
    .update(state)
    .digest('hex');
  
  const isValid = (
    crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(validSig, 'hex')
    ) && state === providedState
  );
  
  if (!isValid) {
    console.error('❌ CSRF state verification failed', {
      cookieState: `${state.substring(0, 8)  }...`,
      providedState: `${providedState?.substring(0, 8)  }...`,
      statesMatch: state === providedState
    });
  }
  
  return isValid;
}
