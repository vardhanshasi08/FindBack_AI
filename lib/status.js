// Shared FindBack AI vocabulary, status metadata and formatting helpers.

export const MATCH_THRESHOLD = 70;

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

export const HANDOVER_PLACES = [
  'College or university security desk',
  'Hospital reception',
  'Railway station help desk',
  'Airport information desk',
  'Office reception',
  'Bus stand enquiry counter',
  'Another public location',
];

export const FLOW = [
  { status: 'LOST_REPORTED', label: 'Reported' },
  { status: 'MATCH_FOUND', label: 'Potential match' },
  { status: 'CLAIM_PENDING', label: 'Claim review' },
  { status: 'CLAIM_APPROVED', label: 'Claim approved' },
  { status: 'AWAITING_HANDOVER_DETAILS', label: 'Handover details' },
  { status: 'HANDOVER_SCHEDULED', label: 'Handover scheduled' },
  { status: 'RETURNED', label: 'Returned' },
];

export const STATUS_LABELS = {
  LOST_REPORTED: 'Reported lost',
  FOUND_REPORTED: 'Reported found',
  MATCH_FOUND: 'Potential match',
  CLAIM_PENDING: 'Claim pending review',
  CLAIM_APPROVED: 'Claim approved',
  AWAITING_HANDOVER_DETAILS: 'Awaiting handover details',
  HANDOVER_SCHEDULED: 'Handover scheduled',
  RETURNED: 'Returned — case closed',
  CLAIM_REJECTED: 'Claim rejected',
};

const TONES = {
  LOST_REPORTED: 'amber',
  FOUND_REPORTED: 'cyan',
  MATCH_FOUND: 'violet',
  CLAIM_PENDING: 'amber',
  CLAIM_APPROVED: 'green',
  AWAITING_HANDOVER_DETAILS: 'amber',
  HANDOVER_SCHEDULED: 'violet',
  RETURNED: 'green',
  CLAIM_REJECTED: 'red',
};

const TONE_CLASSES = {
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  cyan: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  violet: 'border-violet-500/40 bg-violet-500/10 text-violet-200',
  green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  red: 'border-red-500/40 bg-red-500/10 text-red-300',
  slate: 'border-border bg-secondary text-muted-foreground',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || (status ? status.replaceAll('_', ' ').toLowerCase() : 'Unknown');
}

export function statusClasses(status) {
  return TONE_CLASSES[TONES[status] || 'slate'];
}

export function statusDotClasses(status) {
  const tone = TONES[status] || 'slate';
  return {
    amber: 'bg-amber-400',
    cyan: 'bg-cyan-400',
    violet: 'bg-violet-400',
    green: 'bg-emerald-400',
    red: 'bg-red-400',
    slate: 'bg-slate-400',
  }[tone];
}

export function flowIndex(status) {
  return FLOW.findIndex((step) => step.status === status);
}

export function scoreClasses(score) {
  if (score === null || score === undefined) return TONE_CLASSES.slate;
  if (score >= MATCH_THRESHOLD) return TONE_CLASSES.cyan;
  if (score >= 45) return TONE_CLASSES.amber;
  return TONE_CLASSES.slate;
}

export function scoreTextClasses(score) {
  if (score === null || score === undefined) return 'text-muted-foreground';
  if (score >= MATCH_THRESHOLD) return 'text-cyan-300';
  if (score >= 45) return 'text-amber-300';
  return 'text-muted-foreground';
}

export function isQualifying(score) {
  return typeof score === 'number' && score >= MATCH_THRESHOLD;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(value) {
  if (!value || typeof value !== 'string') return '—';
  const [hour, minute] = value.split(':');
  if (hour === undefined || minute === undefined) return value;
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(value);
}

export function countdown(expiresAt, now = Date.now()) {
  const target = new Date(expiresAt).getTime();
  if (Number.isNaN(target)) return '—';
  const left = Math.max(0, target - now);
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Case-insensitive $regex pattern without relying on regex options. */
export function regexSearch(term) {
  const safe = String(term || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe
    .split('')
    .map((char) => (/[a-zA-Z]/.test(char) ? `[${char.toLowerCase()}${char.toUpperCase()}]` : char))
    .join('');
}

export const NOTIFICATION_TITLES = {
  REPORT_SUBMITTED: 'Report updates',
  MATCH_FOUND: 'Match alerts',
  CLAIM_SUBMITTED: 'Claim updates',
  CLAIM_APPROVED: 'Claim updates',
  CLAIM_REJECTED: 'Claim updates',
  HANDOVER_SCHEDULED: 'Handover updates',
  HANDOVER_UPDATED: 'Handover updates',
  ITEM_RETURNED: 'Recovery complete',
  HANDOVER_COMPLETED: 'Recovery complete',
  GENERAL: 'General',
};