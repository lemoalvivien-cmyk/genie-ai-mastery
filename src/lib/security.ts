// Brute force & session security utilities

const BRUTE_FORCE_KEY = "genie_ia_login_attempts";
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 5;

interface AttemptRecord {
  count: number;
  blockedUntil: number | null;
  lastAttempt: number;
}

function getRecord(email: string): AttemptRecord {
  try {
    const raw = sessionStorage.getItem(`${BRUTE_FORCE_KEY}_${btoa(email)}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: 0, blockedUntil: null, lastAttempt: 0 };
}

function saveRecord(email: string, record: AttemptRecord) {
  try {
    sessionStorage.setItem(
      `${BRUTE_FORCE_KEY}_${btoa(email)}`,
      JSON.stringify(record)
    );
  } catch {}
}

export function isBlocked(email: string): { blocked: boolean; remainingMs: number } {
  const record = getRecord(email);
  if (record.blockedUntil && Date.now() < record.blockedUntil) {
    return { blocked: true, remainingMs: record.blockedUntil - Date.now() };
  }
  return { blocked: false, remainingMs: 0 };
}

export function recordFailedAttempt(email: string): void {
  const record = getRecord(email);
  // Reset if block expired
  if (record.blockedUntil && Date.now() >= record.blockedUntil) {
    record.count = 0;
    record.blockedUntil = null;
  }
  record.count += 1;
  record.lastAttempt = Date.now();
  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = Date.now() + BLOCK_DURATION_MS;
  }
  saveRecord(email, record);
}

export function clearAttempts(email: string): void {
  try {
    sessionStorage.removeItem(`${BRUTE_FORCE_KEY}_${btoa(email)}`);
  } catch {}
}

export function formatBlockedTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

// Session activity tracking
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24h
const LAST_ACTIVITY_KEY = "genie_ia_last_activity";

export function updateActivity(): void {
  try {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {}
}

export function isSessionExpired(): boolean {
  try {
    const last = sessionStorage.getItem(LAST_ACTIVITY_KEY);
    if (!last) return false;
    return Date.now() - Number(last) > SESSION_TIMEOUT_MS;
  } catch {
    return false;
  }
}

export function clearActivity(): void {
  try {
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {}
}

// Password strength validation
export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Minimum 8 caractères";
  if (!/[A-Z]/.test(password)) return "Au moins 1 majuscule requise";
  if (!/[0-9]/.test(password)) return "Au moins 1 chiffre requis";
  return null;
}
