import { Counter, Student } from '../models/index.js';

/**
 * Student code generator.
 *
 * Format: `STU-<year>-<5-digit sequence>` (e.g. `STU-2026-00001`) — the
 * shape the UI already advertises. Reservations are atomic per year
 * (counter collection + `$inc`), and a `$max` catch-up keeps the counter
 * past any hand-entered codes that already use the same pattern (e.g.
 * codes entered manually or by the seed script before auto-generation
 * existed).
 */
const CODE_PREFIX = 'STU';
const CODE_WIDTH = 5;

function counterKey(year: number): string {
  return `studentCode:${year}`;
}

/** `STU-2026-00001`-style code for the given year and sequence number. */
function formatCode(year: number, seq: number): string {
  return `${CODE_PREFIX}-${year}-${String(seq).padStart(CODE_WIDTH, '0')}`;
}

/**
 * Highest numeric suffix already stored for codes matching this year's
 * pattern. Fixed-width zero padding makes lexicographic order equal to
 * numeric order, so the lexicographically largest match is the answer.
 */
async function highestUsedSequence(year: number): Promise<number> {
  const prefix = `${CODE_PREFIX}-${year}-`;
  const last = await Student.findOne({
    studentCode: { $regex: `^${prefix}\\d{${CODE_WIDTH}}$` },
  })
    .sort({ studentCode: -1 })
    .select('studentCode')
    .lean();

  const code = last?.studentCode;
  if (!code) return 0;

  const suffix = Number(code.slice(prefix.length));
  return Number.isFinite(suffix) ? suffix : 0;
}

/**
 * Reserve the next auto-generated student code for the current year.
 *
 * Two atomic steps: `$inc` the per-year counter, then `$max` it past any
 * stored code sharing the same prefix, so generated codes never collide
 * with hand-entered ones.
 */
export async function nextStudentCode(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const key = counterKey(year);

  const reserved = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  const reservedSeq = reserved?.seq ?? 1;

  const used = await highestUsedSequence(year);
  if (used < reservedSeq) return formatCode(year, reservedSeq);

  const caughtUp = await Counter.findOneAndUpdate(
    { key },
    { $max: { seq: used + 1 } },
    { new: true },
  );
  return formatCode(year, caughtUp?.seq ?? used + 1);
}