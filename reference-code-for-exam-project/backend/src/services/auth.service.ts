import { User, Student } from '../models/index.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { OWNER_TYPES, ROLES, type OwnerType, type Role } from '../config/constants.js';
import { ConflictError, NotFoundError, UnauthorizedError, AppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import type { UserDoc } from '../models/user.model.js';
import type { StudentDoc } from '../models/student.model.js';

export interface CreateStaffUserInput {
  fullName: string;
  username: string;
  password: string;
  role?: Role;
}

export type PublicUser = {
  id: string;
  fullName: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicStudent = {
  id: string;
  fullName: string;
  studentCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface AuthResult {
  ownerType: OwnerType;
  user?: PublicUser;
  student?: PublicStudent;
  tokens: TokenPair;
}

const toPublicUser = (u: UserDoc): PublicUser => ({
  id: String(u._id),
  fullName: u.fullName,
  username: u.username,
  role: u.role,
  isActive: u.isActive,
  createdAt: u.createdAt.toISOString(),
  updatedAt: u.updatedAt.toISOString(),
});

export const toPublicStudent = (s: StudentDoc): PublicStudent => ({
  id: String(s._id),
  fullName: s.fullName,
  studentCode: s.studentCode,
  isActive: s.isActive,
  createdAt: s.createdAt.toISOString(),
  updatedAt: s.updatedAt.toISOString(),
});

function mintStaffTokens(user: UserDoc): TokenPair {
  return {
    access: signAccessToken({
      sub: String(user._id),
      ownerType: OWNER_TYPES.USER,
      role: user.role as Role,
    }),
    refresh: signRefreshToken({
      sub: String(user._id),
      ownerType: OWNER_TYPES.USER,
      role: user.role as Role,
      tv: user.tokenVersion ?? 0,
    }),
  };
}

function mintStudentTokens(student: StudentDoc, examId: string): TokenPair {
  return {
    access: signAccessToken({
      sub: String(student._id),
      ownerType: OWNER_TYPES.STUDENT,
      examId,
    }),
    refresh: signRefreshToken({
      sub: String(student._id),
      ownerType: OWNER_TYPES.STUDENT,
      examId,
      tv: student.tokenVersion ?? 0,
    }),
  };
}

/**
 * Creates a staff account (admin/teacher). This is the ONLY way staff
 * accounts come into existence besides the env-bootstrapped admin
 * (see `ensureBootstrapAdmin` below) — there is intentionally no
 * public self-registration endpoint. Callers must already be an
 * authenticated admin; the route enforces that with
 * `requireAuth + requireRole(ADMIN)`.
 */
export async function createStaffUser(input: CreateStaffUserInput): Promise<PublicUser> {
  const username = input.username.trim().toLowerCase();
  const exists = await User.findOne({ username });
  if (exists) throw new ConflictError('Username already taken');

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    fullName: input.fullName.trim(),
    username,
    passwordHash,
    role: input.role ?? ROLES.TEACHER,
  });
  user.tokenVersion = user.tokenVersion ?? 0;

  return toPublicUser(user);
}

/** Lists every staff account (admin-only). Never returns password hashes. */
export async function listStaffUsers(): Promise<PublicUser[]> {
  const users = await User.find({}).sort({ createdAt: 1 });
  return users.map(toPublicUser);
}

/**
 * Admin-only password reset for a staff account. Also bumps the
 * target's tokenVersion (via `changePassword`), so all of their
 * existing sessions are revoked and they must sign in again.
 */
export async function resetStaffPassword(userId: string, newPassword: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  await changePassword(String(user._id), newPassword);
  const updated = await User.findById(userId);
  return toPublicUser(updated!);
}

/**
 * Ensures the env-configured bootstrap admin exists. Called once on
 * startup (after the DB connects) from `src/index.ts`.
 *
 * - Reads `ADMIN` (username; `ADMIN_USERNAME` accepted as a deprecated
 *   alias) + `ADMIN_PASSWORD` from the environment.
 * - Both unset → no-op with a warning (no staff account can be created
 *   until an admin exists; set the env vars and restart).
 * - Only one set → throws, so a half-configured deployment fails fast
 *   instead of silently having no admin.
 * - Admin already exists → left completely untouched: the stored
 *   password is NEVER overwritten on restart, so a password changed
 *   through the admin UI survives restarts.
 * - Otherwise creates the admin (role `admin`, active) exactly once.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const username = (env.ADMIN || env.ADMIN_USERNAME || '').trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;

  if (!username && !password) {
    console.warn(
      '⚠️  ADMIN / ADMIN_PASSWORD are not set — no bootstrap admin will be created. ' +
        'Set both values and restart to create the first admin.',
    );
    return;
  }
  if (!username || !password) {
    throw new Error('Both ADMIN and ADMIN_PASSWORD must be set together to bootstrap the admin.');
  }

  const existing = await User.findOne({ username });
  if (existing) {
    if (existing.role !== ROLES.ADMIN) {
      existing.role = ROLES.ADMIN;
      await existing.save();
      console.warn(`⚠️  Bootstrap user ${username} existed without the admin role — promoted to admin.`);
    } else {
      console.log(`ℹ️  Bootstrap admin ${username} already exists — leaving it unchanged.`);
    }
    return;
  }

  const passwordHash = await hashPassword(password);
  await User.create({
    fullName: 'Administrator',
    username,
    passwordHash,
    role: ROLES.ADMIN,
    isActive: true,
  });
  console.log(`✅ Bootstrap admin created: ${username}`);
}

// In-memory login throttle: 5 failed attempts per username per 5 minutes.
// (No DB lockout — a restart clears it; LAN-only deployment.)
const loginFailures = new Map<string, number[]>();
const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

export async function login(username: string, password: string): Promise<AuthResult> {
  const normalized = username.trim().toLowerCase();
  const now = Date.now();
  const recent = (loginFailures.get(normalized) ?? []).filter((ts) => now - ts < LOGIN_WINDOW_MS);
  if (recent.length >= LOGIN_MAX_FAILURES) {
    throw new AppError('Too many failed login attempts — try again in a few minutes.', 429, 'RATE_LIMITED');
  }
  const user = await User.findOne({ username: normalized }).select('+passwordHash +tokenVersion');
  const fail = () => {
    recent.push(now);
    loginFailures.set(normalized, recent);
    throw new UnauthorizedError('Invalid credentials');
  };
  if (!user || !user.isActive) fail();
  const ok = await verifyPassword(password, user!.passwordHash);
  if (!ok) fail();
  loginFailures.delete(normalized);

  return {
    ownerType: OWNER_TYPES.USER,
    user: toPublicUser(user!),
    tokens: mintStaffTokens(user!),
  };
}

export async function me(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) throw new UnauthorizedError('User not found');
  return toPublicUser(user);
}

export async function meStudent(studentId: string): Promise<PublicStudent> {
  const student = await Student.findById(studentId);
  if (!student) throw new UnauthorizedError('Student not found');
  return toPublicStudent(student);
}

export async function rotateRefreshToken(rawRefreshToken: string): Promise<{
  tokens: TokenPair;
  ownerType: OwnerType;
}> {
  const payload = verifyRefreshToken(rawRefreshToken);

  if (payload.ownerType === OWNER_TYPES.USER) {
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (!user || !user.isActive) throw new UnauthorizedError('Session revoked');
    if ((user.tokenVersion ?? 0) !== payload.tv) {
      throw new UnauthorizedError('Session revoked — please sign in again');
    }
    return { tokens: mintStaffTokens(user), ownerType: OWNER_TYPES.USER };
  }

  const student = await Student.findById(payload.sub).select('+tokenVersion');
  if (!student || !student.isActive) throw new UnauthorizedError('Session revoked');
  if ((student.tokenVersion ?? 0) !== payload.tv) {
    throw new UnauthorizedError('Session revoked — please sign in again');
  }
  return {
    tokens: mintStudentTokens(student, payload.examId ?? ''),
    ownerType: OWNER_TYPES.STUDENT,
  };
}

export async function revokeAllSessions(ownerType: OwnerType, ownerId: string): Promise<void> {
  if (ownerType === OWNER_TYPES.USER) {
    await User.updateOne({ _id: ownerId }, { $inc: { tokenVersion: 1 } });
  } else {
    await Student.updateOne({ _id: ownerId }, { $inc: { tokenVersion: 1 } });
  }
}

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await User.updateOne({ _id: userId }, { $set: { passwordHash }, $inc: { tokenVersion: 1 } });
}
