export type Role = "student" | "teacher";

export type Account = {
  username: string;
  name: string;
  role: Role;
  salt: string;
  hash: string;
  iterations: number;
  createdAt: string;
};

export type SessionUser = {
  username: string;
  name: string;
  role: Role;
};

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string; field?: "username" | "password" | "name" };

export const DEMO_STUDENT = {
  username: "student",
  password: "praxis-student",
  name: "Aarav Mehta",
  role: "student" as const,
};

export const DEMO_TEACHER = {
  username: "teacher",
  password: "praxis-teacher",
  name: "Meera Rao",
  role: "teacher" as const,
};

const ACCOUNTS_KEY = "praxis.accounts.v1";
const SESSION_KEY = "praxis.session.v1";
const ITERATIONS = 150_000;
const DUMMY_SALT = "AAAAAAAAAAAAAAAAAAAAAA==";
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,23}$/i;

function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is Account =>
        Boolean(entry) &&
        typeof entry.username === "string" &&
        typeof entry.hash === "string" &&
        typeof entry.salt === "string" &&
        (entry.role === "student" || entry.role === "teacher"),
    );
  } catch {
    return [];
  }
}

function writeAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function derivePassword(
  password: string,
  salt: string,
  iterations = ITERATIONS,
) {
  if (!crypto.subtle) {
    throw new Error(
      "This browser cannot create a secure local account. Open the site over HTTPS.",
    );
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBytes(salt),
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

async function makeAccount(
  input: { name: string; username: string; password: string; role: Role },
): Promise<Account> {
  const salt = randomSalt();
  const hash = await derivePassword(input.password, salt);
  return {
    username: input.username.trim().toLowerCase(),
    name: input.name.trim(),
    role: input.role,
    salt,
    hash,
    iterations: ITERATIONS,
    createdAt: new Date().toISOString(),
  };
}

let seedPromise: Promise<void> | null = null;

export function ensureSeedAccounts() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const accounts = readAccounts();
      let changed = false;
      for (const demo of [DEMO_STUDENT, DEMO_TEACHER]) {
        if (accounts.some((account) => account.username === demo.username)) {
          continue;
        }
        accounts.push(
          await makeAccount({
            name: demo.name,
            username: demo.username,
            password: demo.password,
            role: demo.role,
          }),
        );
        changed = true;
      }
      if (changed) writeAccounts(accounts);
    } catch {
      // The login screen surfaces a readable error if secure hashing is unavailable.
    }
  })();
  return seedPromise;
}

function publicUser(account: Account): SessionUser {
  return {
    username: account.username,
    name: account.name,
    role: account.role,
  };
}

function storeSession(user: SessionUser) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ username: user.username, at: new Date().toISOString() }),
    );
  } catch {
    // The session still works for this page view if storage is unavailable.
  }
}

export function restoreSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { username?: string };
    if (typeof parsed.username !== "string") return null;
    const account = readAccounts().find(
      (entry) => entry.username === parsed.username,
    );
    if (!account) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return publicUser(account);
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export async function signIn(
  username: string,
  password: string,
): Promise<AuthResult> {
  await ensureSeedAccounts();
  const normalized = username.trim().toLowerCase();
  if (!normalized || !password) {
    return {
      ok: false,
      error: "Enter both your username and password.",
    };
  }
  const account = readAccounts().find(
    (entry) => entry.username === normalized,
  );
  let candidate = "";
  try {
    candidate = await derivePassword(
      password,
      account?.salt ?? DUMMY_SALT,
      account?.iterations ?? ITERATIONS,
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not verify the password.",
    };
  }
  if (!account || !safeEqual(candidate, account.hash)) {
    return {
      ok: false,
      error: "That username and password do not match.",
    };
  }
  const user = publicUser(account);
  storeSession(user);
  return { ok: true, user };
}

export async function signUp(input: {
  name: string;
  username: string;
  password: string;
  confirm: string;
}): Promise<AuthResult> {
  await ensureSeedAccounts();
  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();
  if (name.length < 2) {
    return {
      ok: false,
      error: "Add a name with at least 2 characters.",
      field: "name",
    };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error:
        "Use 3–24 letters, numbers, dots, dashes or underscores. Start with a letter or number.",
      field: "username",
    };
  }
  if (input.password.length < 8) {
    return {
      ok: false,
      error: "Use a password with at least 8 characters.",
      field: "password",
    };
  }
  if (input.password !== input.confirm) {
    return {
      ok: false,
      error: "The two passwords do not match.",
      field: "password",
    };
  }
  if (readAccounts().some((entry) => entry.username === username)) {
    return {
      ok: false,
      error: "That username is already taken on this device.",
      field: "username",
    };
  }
  try {
    const account = await makeAccount({
      name,
      username,
      password: input.password,
      role: "student",
    });
    writeAccounts([...readAccounts(), account]);
    const user = publicUser(account);
    storeSession(user);
    return { ok: true, user };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not create the account.",
    };
  }
}

export function signOut() {
  clearSession();
}

export function demoCredentials(role: Role) {
  return role === "teacher" ? DEMO_TEACHER : DEMO_STUDENT;
}
