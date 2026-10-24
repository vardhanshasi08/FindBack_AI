// Shared constants and small pure helpers for the FindBack AI recovery workflow.

export const CATEGORIES = [
  'Electronics',
  'Bags and Wallets',
  'Documents and Identity Cards',
  'Keys',
  'Jewellery and Accessories',
  'Clothing',
  'Books and Stationery',
  'Personal Items',
  'Other',
];

// Configurable similarity threshold (change this single value to retune the platform).
export const MATCH_THRESHOLD = 70;

export const MAX_CANDIDATES = 5;
export const MAX_CANDIDATE_IMAGES = 3;

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_ISSUES = 25;
export const OTP_MIN_INTERVAL_MS = 3000;
export const OTP_MIN_ATTEMPT_GAP_MS = 2000;

export const LOST_STATUS = 'LOST_REPORTED';
export const FOUND_STATUS = 'FOUND_REPORTED';

// Forward-only report/case lifecycle.
export const FLOW = [
  'LOST_REPORTED',
  'MATCH_FOUND',
  'CLAIM_PENDING',
  'CLAIM_APPROVED',
  'AWAITING_HANDOVER_DETAILS',
  'HANDOVER_SCHEDULED',
  'RETURNED',
];

// Reports that may still be matched against new opposing reports.
export const MATCHABLE_STATUSES = ['LOST_REPORTED', 'FOUND_REPORTED', 'MATCH_FOUND'];
// Reports/cases that are finished and must never be matched again.
export const CLOSED_STATUSES = [
  'CLAIM_PENDING',
  'CLAIM_APPROVED',
  'AWAITING_HANDOVER_DETAILS',
  'HANDOVER_SCHEDULED',
  'RETURNED',
  'CLAIM_REJECTED',
];

export const EDITABLE_REPORT_STATUSES = ['LOST_REPORTED', 'MATCH_FOUND', 'FOUND_REPORTED'];

export function nowIso() {
  return new Date().toISOString();
}

export function makeCode(prefix) {
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < arr.length; i++) out += alphabet[arr[i] % alphabet.length];
  return `${prefix}-${out}`;
}

/** Move a status forward only: never regress a report or case that went further. */
export function advanceStatus(current, target) {
  const from = FLOW.indexOf(current);
  const to = FLOW.indexOf(target);
  if (to === -1) return current;
  if (from === -1) return target;
  return to > from ? target : current;
}

export const CATEGORY_LIST = CATEGORIES;