import { OTP_MAX_ATTEMPTS } from './constants.ts';

// The runtime refuses PBKDF2 iteration counts above 100000.
const PBKDF2_ITERATIONS = 100000;

export function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Cryptographically secure 6-digit handover code. */
export function generateOtpCode() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, '0');
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/** PBKDF2-SHA256 — the plaintext code is never stored. */
export async function hashOtp(code, saltHex) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function otpState(otp, nowMs = Date.now()) {
  if (!otp) return { usable: false, reason: 'No handover code has been generated yet.' };
  if (otp.consumed) return { usable: false, reason: 'This handover code was already used.' };
  if ((otp.failed_attempts || 0) >= OTP_MAX_ATTEMPTS) {
    return { usable: false, reason: 'Too many incorrect attempts. Ask the owner to generate a new code.' };
  }
  const expires = new Date(otp.otp_expires_at || 0).getTime();
  if (!expires || expires <= nowMs) {
    return { usable: false, reason: 'This handover code has expired. Ask the owner to generate a new code.' };
  }
  return { usable: true };
}

export function attemptsLeft(otp) {
  const used = (otp && otp.failed_attempts) || 0;
  return Math.max(0, OTP_MAX_ATTEMPTS - used);
}