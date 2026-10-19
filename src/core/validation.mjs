export class DomainError extends Error {
  constructor(code) { super(code); this.name = 'DomainError'; this.code = code; }
}
export function requireThat(condition, code) {
  if (!condition) throw new DomainError(code);
}
export function whole(value, code = 'INVALID_INTEGER') {
  requireThat(Number.isSafeInteger(value) && value >= 0, code);
  return value;
}
export function documentId(value) {
  requireThat(typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value), 'INVALID_ID');
  return value;
}
