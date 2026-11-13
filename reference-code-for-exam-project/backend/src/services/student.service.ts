import { Student } from '../models/index.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../lib/errors.js';
import { ROLES } from '../config/constants.js';
import { nextStudentCode } from './student-code.service.js';
import { revokeStudent } from './biometric.service.js';
import { BiometricEvent } from '../models/index.js';
import { BIOMETRIC_EVENT } from '../config/constants.js';

export interface CreateStudentInput {
  fullName: string;
  /**
   * Optional. Omitted (or blank) → the backend reserves the next code in
   * the `STU-<year>-<seq>` sequence. Provided → must be unique; a taken
   * code answers with a conflict.
   */
  studentCode?: string;
}

/**
 * Codes are normalised to upper-case so a stored code always matches how
 * public lookups query it (GET /candidates/lookup upper-cases the query).
 */
function normalizeCode(code: string | undefined): string | undefined {
  const upper = code?.trim().toUpperCase();
  return upper || undefined;
}

/** True when a write failed on a unique index (Mongo E11000). */
function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

/** Bounded retries when a reserved code gets used between reserve and insert. */
const MAX_GENERATED_CODE_ATTEMPTS = 5;

export async function createStudent(input: CreateStudentInput) {
  const code = normalizeCode(input.studentCode);
  if (code) return createWithExplicitCode(input, code);
  return createWithGeneratedCode(input);
}

async function createWithExplicitCode(input: CreateStudentInput, code: string) {
  const exists = await Student.findOne({ studentCode: code });
  if (exists) throw new ConflictError('A student with this code already exists');
  try {
    return await insertStudent({ ...input, studentCode: code });
  } catch (error) {
    // The unique index is the last line of defense against a duplicate
    // slipping in between the check above and the insert.
    if (isDuplicateKeyError(error)) {
      throw new ConflictError('A student with this code already exists');
    }
    throw error;
  }
}

async function createWithGeneratedCode(input: CreateStudentInput) {
  for (let attempt = 0; attempt < MAX_GENERATED_CODE_ATTEMPTS; attempt += 1) {
    const code = await nextStudentCode();
    try {
      return await insertStudent({ ...input, studentCode: code });
    } catch (error) {
      // Another create consumed the reserved code meanwhile (e.g. a manual
      // entry with the same code) — simply reserve the next one.
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  throw new ConflictError('Could not allocate a free student code — please retry');
}

async function insertStudent(input: CreateStudentInput & { studentCode: string }) {
  return Student.create({
    fullName: input.fullName,
    studentCode: input.studentCode,
  });
}

export interface StudentListParams {
  q?: string;
  page?: number;
  limit?: number;
}

/** Escape a user-supplied string for use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Paginated, searchable student list (server-side, so it scales to
 * tens of thousands). `q` matches name or student code,
 * case-insensitively. Defaults: page 1, 24 per page.
 */
export async function listStudents(params: StudentListParams = {}) {
  const page = Math.max(1, Math.floor(params.page ?? 1) || 1);
  const limit = Math.min(5000, Math.max(1, Math.floor(params.limit ?? 24) || 24));
  const q = (params.q ?? '').trim();

  const filter = q
    ? {
        $or: [
          { fullName: new RegExp(escapeRegExp(q), 'i') },
          { studentCode: new RegExp(escapeRegExp(q), 'i') },
        ],
      }
    : {};

  const total = await Student.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  const items = await Student.find(filter)
    .sort({ createdAt: -1 })
    .skip((safePage - 1) * limit)
    .limit(limit);
  return { items, total, page: safePage, limit, pages };
}

export async function getStudent(id: string) {
  const s = await Student.findById(id);
  if (!s) throw new NotFoundError('Student not found');
  return s;
}

export interface UpdateStudentInput {
  fullName?: string;
  /**
   * Admin-only re-assignment of the student code (e.g. to fix a typo).
   * Teachers may never change it — the route and this service both enforce
   * that. Must be unique; a taken code answers with a conflict.
   */
  studentCode?: string;
}

/**
 * Update a student's editable info (name). `studentCode` is
 * immutable for teachers — it is the student's permanent identifier.
 * An ADMIN may re-assign it, subject to uniqueness. The update validator
 * normalises the code to upper-case; a teacher-supplied code is rejected
 * here as a second layer of defense.
 */
export async function updateStudent(id: string, patch: UpdateStudentInput, actorRole?: string) {
  const s = await getStudent(id);

  if (patch.studentCode !== undefined && patch.studentCode !== s.studentCode) {
    if (actorRole !== ROLES.ADMIN) {
      throw new ForbiddenError('Only an admin can change a student code');
    }
    const code = normalizeCode(patch.studentCode);
    if (code) {
      const exists = await Student.findOne({ studentCode: code, _id: { $ne: s._id } });
      if (exists) throw new ConflictError('A student with this code already exists');
      s.studentCode = code;
    }
  }

  if (patch.fullName !== undefined) s.fullName = patch.fullName;

  try {
    await s.save();
  } catch (error) {
    // The unique index is the last line of defense against a duplicate
    // slipping in between the check above and the save.
    if (isDuplicateKeyError(error)) {
      throw new ConflictError('A student with this code already exists');
    }
    throw error;
  }
  return s;
}

export async function deleteStudent(id: string) {
  const s = await getStudent(id);
  // Remove the face embedding from Mongo, the enrollment photo from
  // storage, and the vector from the FAISS gallery — otherwise a
  // deleted student would linger in the 1:N search space. Best-effort:
  // the record is deleted either way and startup rebuild resyncs.
  try { await revokeStudent(id); } catch { /* ignore */ }
  try { await BiometricEvent.create({ studentId: s._id, event: BIOMETRIC_EVENT.REVOKE, detail: 'student-deleted' }); } catch { /* ignore */ }
  await s.deleteOne();
}
