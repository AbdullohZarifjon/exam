/**
 * Seed the dev database with realistic test data.
 *
 * Run with:  npm --workspace backend run seed
 *   or:      npx tsx backend/scripts/seed.ts
 *
 * Idempotent-ish: skips documents that already exist (by email / code /
 * title) so you can run it multiple times safely. To start fresh, drop
 * the `exam_db` database in Mongo and rerun.
 */
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/user.model.js';
import { Student } from '../src/models/student.model.js';
import { Exam } from '../src/models/exam.model.js';
import { Question } from '../src/models/question.model.js';
import { hashPassword } from '../src/lib/password.js';
import { Types } from 'mongoose';
import { EXAM_STATUS } from '../src/config/constants.js';

const COLORS = ['#b91c1c', '#1d4ed8', '#047857', '#b45309', '#7c3aed', '#0891b2'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function ensureUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'moderator';
}) {
  const exists = await User.findOne({ email: input.email });
  if (exists) {
    console.log(`  • user exists: ${input.email}`);
    return exists;
  }
  const passwordHash = await hashPassword(input.password);
  const u = await User.create({ ...input, passwordHash });
  console.log(`  + user created: ${input.email} (${input.role})`);
  return u;
}

async function ensureStudent(input: { fullName: string; studentCode: string; email?: string }) {
  const exists = await Student.findOne({ studentCode: input.studentCode });
  if (exists) {
    console.log(`  • student exists: ${input.studentCode} — ${exists.fullName}`);
    return exists;
  }
  const s = await Student.create(input);
  console.log(`  + student created: ${input.studentCode} — ${input.fullName}`);
  return s;
}

/**
 * Moderators are staff accounts (User, role 'moderator') — email +
 * password login, no PINs. Same email-uniqueness guarantees as users.
 */
async function ensureModerator(input: { fullName: string; email: string; password: string }) {
  const exists = await User.findOne({ email: input.email });
  if (exists) {
    console.log(`  • moderator exists: ${input.email} — ${exists.fullName}`);
    return exists;
  }
  const passwordHash = await hashPassword(input.password);
  const m = await User.create({ ...input, passwordHash, role: 'moderator' });
  console.log(`  + moderator created: ${input.email} — ${input.fullName}`);
  return m;
}

async function ensureExam(input: {
  title: string;
  description?: string;
  timerMinutes: number;
  questionsToServe: number;
  status: 'draft' | 'published' | 'archived';
  createdBy: string;
}) {
  const exists = await Exam.findOne({ title: input.title });
  if (exists) {
    console.log(`  • exam exists: ${input.title}`);
    return exists;
  }
  const e = await Exam.create({ ...input });
  console.log(`  + exam created: ${input.title} (${input.status})`);
  return e;
}

async function ensureQuestion(input: {
  examId: Types.ObjectId;
  text: string;
  options: { text: string }[];
  correctOptionIndexes: number[];
  tags?: string[];
  imageUrl?: string;
}) {
  const exists = await Question.findOne({ examId: input.examId, text: input.text });
  if (exists) return exists;
  const opts = input.options.map((o) => ({ text: o.text }));
  const temp = new Question({
    examId: input.examId,
    text: input.text,
    options: opts,
    tags: input.tags ?? [],
    imageUrl: input.imageUrl,
    isActive: true,
    correctOptionIds: [],
  });
  temp.correctOptionIds = input.correctOptionIndexes.map(
    (i) => temp.options[i]!._id as Types.ObjectId,
  );
  const q = await temp.save();
  return q;
}

async function main() {
  await connectDB();

  console.log('\n=== Users ===');
  const admin = await ensureUser({
    fullName: 'System Admin',
    email: 'admin@school.example',
    password: 'admin12345',
    role: 'admin',
  });
  const teacher = await ensureUser({
    fullName: 'Maria Ionescu',
    email: 'maria@school.example',
    password: 'teacher12345',
    role: 'teacher',
  });
  const teacher2 = await ensureUser({
    fullName: 'Andrei Vasilescu',
    email: 'andrei@school.example',
    password: 'teacher12345',
    role: 'teacher',
  });

  console.log('\n=== Moderators ===');
  const mod1 = await ensureModerator({
    fullName: 'Elena Radu',
    email: 'elena.moderator@school.example',
    password: 'moderator12345',
  });
  const mod2 = await ensureModerator({
    fullName: 'Vlad Marinescu',
    email: 'vlad.moderator@school.example',
    password: 'moderator12345',
  });

  console.log('\n=== Students ===');
  const students = await Promise.all(
    [
      { fullName: 'Andrei Popescu', studentCode: 'STU-2026-00417', email: 'andrei.p@example.com' },
      { fullName: 'Elena Stan', studentCode: 'STU-2026-00418', email: 'elena.s@example.com' },
      { fullName: 'Mihai Iordan', studentCode: 'STU-2026-00419', email: 'mihai.i@example.com' },
      { fullName: 'Sofia Marin', studentCode: 'STU-2026-00420', email: 'sofia.m@example.com' },
      { fullName: 'David Voicu', studentCode: 'STU-2026-00421', email: 'david.v@example.com' },
      { fullName: 'Ana Cristea', studentCode: 'STU-2026-00422', email: 'ana.c@example.com' },
      // passport-style codes for the candidate-portal flow
      { fullName: 'Ionuț Albu', studentCode: 'AD2969676' },
      { fullName: 'Roxana Diaconu', studentCode: 'MK7123481' },
    ].map((s) => ensureStudent(s)),
  );

  console.log('\n=== Exams ===');

  // Exam 1: published, with 5 questions
  const exam1 = await ensureExam({
    title: 'Basic Arithmetic — Level 1',
    description: 'Warm-up test on addition and subtraction. 10 minutes, 5 questions.',
    timerMinutes: 10,
    questionsToServe: 5,
    status: EXAM_STATUS.PUBLISHED,
    createdBy: teacher._id,
  });

  console.log('\n  ↳ questions for "Basic Arithmetic — Level 1"');
  await Promise.all(
    [
      {
        text: '1 + 1 = ?',
        options: [{ text: '9' }, { text: '2' }, { text: '3' }, { text: '4' }],
        correctOptionIndexes: [1],
        tags: ['arithmetic', 'addition'],
      },
      {
        text: '5 - 3 = ?',
        options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '8' }],
        correctOptionIndexes: [1],
        tags: ['arithmetic', 'subtraction'],
      },
      {
        text: '12 + 7 = ?',
        options: [{ text: '18' }, { text: '19' }, { text: '20' }, { text: '21' }],
        correctOptionIndexes: [1],
        tags: ['arithmetic', 'addition'],
      },
      {
        text: '15 - 8 = ?',
        options: [{ text: '5' }, { text: '6' }, { text: '7' }, { text: '9' }],
        correctOptionIndexes: [2],
        tags: ['arithmetic', 'subtraction'],
      },
      {
        text: 'Which of the following equal 10? (select all)',
        options: [{ text: '4 + 6' }, { text: '8 + 1' }, { text: '7 + 3' }, { text: '5 + 5' }],
        correctOptionIndexes: [0, 2, 3],
        tags: ['arithmetic', 'multi-select'],
      },
    ].map((q) => ensureQuestion({ ...q, examId: exam1._id })),
  );

  // Exam 2: published, with 3 questions
  const exam2 = await ensureExam({
    title: 'World Capitals — Quick Check',
    description: 'Match the country to its capital. 5 minutes, 3 questions.',
    timerMinutes: 5,
    questionsToServe: 3,
    status: EXAM_STATUS.PUBLISHED,
    createdBy: teacher._id,
  });
  console.log('\n  ↳ questions for "World Capitals"');
  await Promise.all(
    [
      {
        text: 'Capital of France?',
        options: [{ text: 'Berlin' }, { text: 'Paris' }, { text: 'Madrid' }, { text: 'Rome' }],
        correctOptionIndexes: [1],
        tags: ['geography'],
      },
      {
        text: 'Capital of Japan?',
        options: [{ text: 'Seoul' }, { text: 'Beijing' }, { text: 'Tokyo' }, { text: 'Bangkok' }],
        correctOptionIndexes: [2],
        tags: ['geography'],
      },
      {
        text: 'Capital of Brazil?',
        options: [
          { text: 'Brasília' },
          { text: 'Rio de Janeiro' },
          { text: 'São Paulo' },
          { text: 'Salvador' },
        ],
        correctOptionIndexes: [0],
        tags: ['geography'],
      },
    ].map((q) => ensureQuestion({ ...q, examId: exam2._id })),
  );

  // Exam 3: draft (so it doesn't show up for candidates)
  const exam3 = await ensureExam({
    title: 'Algebra I — Midterm (draft)',
    description: 'Work in progress. Adds equations, polynomials, and word problems.',
    timerMinutes: 45,
    questionsToServe: 100,
    status: EXAM_STATUS.DRAFT,
    createdBy: teacher2._id,
  });
  console.log('\n  ↳ questions for "Algebra I — Midterm (draft)"');
  await Promise.all(
    [
      {
        text: 'Solve for x: 2x + 5 = 13',
        options: [{ text: '3' }, { text: '4' }, { text: '5' }, { text: '6' }],
        correctOptionIndexes: [1],
        tags: ['algebra', 'linear'],
      },
      {
        text: 'Factor: x² - 9',
        options: [
          { text: '(x - 3)(x - 3)' },
          { text: '(x + 3)(x + 3)' },
          { text: '(x - 3)(x + 3)' },
          { text: '(x - 9)(x + 1)' },
        ],
        correctOptionIndexes: [2],
        tags: ['algebra', 'factoring'],
      },
    ].map((q) => ensureQuestion({ ...q, examId: exam3._id })),
  );

  console.log('\n=== Done ===');
  console.log('Summary:');
  console.log(`  users:      ${await User.countDocuments()}`);
  console.log(`  students:   ${await Student.countDocuments()}`);
  console.log(`  moderators: ${await User.countDocuments({ role: 'moderator' })}`);
  console.log(`  exams:      ${await Exam.countDocuments()}`);
  console.log(`  questions:  ${await Question.countDocuments()}`);

  console.log('\nLogins:');
  console.log('  admin@school.example    / admin12345');
  console.log('  maria@school.example    / teacher12345');
  console.log('  andrei@school.example   / teacher12345');
  console.log('\nModerator logins (role: moderator):');
  console.log('  elena.moderator@school.example / moderator12345');
  console.log('  vlad.moderator@school.example  / moderator12345');
  console.log('\nCandidate codes (try at /candidate):');
  for (const s of students.slice(0, 3)) {
    console.log(`  ${s.studentCode}  —  ${s.fullName}`);
  }
  console.log('\nPassport-style codes:');
  console.log('  AD2969676 — Ionuț Albu');
  console.log('  MK7123481 — Roxana Diaconu');

  // silence unused
  void pick;
  void COLORS;

  await disconnectDB();
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await disconnectDB();
  process.exit(1);
});
