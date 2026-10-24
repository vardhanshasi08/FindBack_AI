export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function fail(error) {
  const status = (error && error.status) || 500;
  const message = (error && error.message) || 'Something went wrong on the server.';
  return Response.json({ error: message }, { status });
}

export function requireText(value, field, options = {}) {
  const { min = 1, max = 4000 } = options;
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min) {
    throw new HttpError(400, min > 1 ? `${field} must be at least ${min} characters.` : `${field} is required.`);
  }
  if (text.length > max) throw new HttpError(400, `${field} must be under ${max} characters.`);
  return text;
}

export function optionalText(value, max = 2000) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > max ? text.slice(0, max) : text;
}

export function isValidIso(value) {
  if (!value || typeof value !== 'string') return false;
  const t = new Date(value).getTime();
  return !Number.isNaN(t);
}

export function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new HttpError(504, `${label} took too long. Please retry.`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}