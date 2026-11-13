/**
 * Generates 2 exams with 1000-question banks each.
 * Students draw a shuffled 100, 5 minutes.
 */
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, Exam, Question } from '../src/models/index.js';
import { createExam, publishExam } from '../src/services/exam.service.js';
import { EXAM_STATUS } from '../src/config/constants.js';

const BANK = 1000;
const SERVE = 100;
const TIMER_MINUTES = 5;

// Deterministic PRNG so the banks are reproducible.
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ri = (rnd: () => number, min: number, max: number) =>
  min + Math.floor(rnd() * (max - min + 1));

function makeQuestion(rnd: () => number, difficulty: number, n: number) {
  let text = '';
  let correct: number[] = [];
  let distractors: number[] = [];

  if (difficulty === 1) {
    const a = ri(rnd, 2, 30), b = ri(rnd, 2, 30);
    if (rnd() < 0.5) { text = `${a} + ${b} = ?`; correct = [a + b]; distractors = [a + b + 1, a + b - 1, a + b + 2]; }
    else { const hi = Math.max(a, b), lo = Math.min(a, b); text = `${hi} - ${lo} = ?`; correct = [hi - lo]; distractors = [hi - lo + 1, Math.max(0, hi - lo - 1), hi - lo + 2]; }
  } else if (difficulty === 2) {
    const a = ri(rnd, 2, 12), b = ri(rnd, 2, 12);
    if (rnd() < 0.5) { text = `${a} × ${b} = ?`; correct = [a * b]; distractors = [a * b + a, a * b - b, a * (b + 1)]; }
    else { const q = ri(rnd, 2, 12), d = ri(rnd, 2, 12); text = `${q * d} ÷ ${d} = ?`; correct = [q]; distractors = [q + 1, q - 1, q + 2]; }
  } else if (difficulty === 3) {
    const a = ri(rnd, 3, 15), b = ri(rnd, 3, 15), c = ri(rnd, 2, 9);
    text = `(${a} + ${b}) × ${c} = ?`; correct = [(a + b) * c]; distractors = [(a + b) * c + c, (a + b + 1) * c, a * b * c];
  } else if (difficulty === 4) {
    const x = ri(rnd, 2, 12), k = ri(rnd, 2, 9);
    text = `Solve for x: ${x}x + ${k} = ${x * x + k}. x = ?`; correct = [x]; distractors = [x + 1, x - 1, x + 2];
  } else {
    const p = ri(rnd, 10, 90) * 10, pct = ri(rnd, 2, 9) * 10;
    text = `What is ${pct}% of ${p}?`; correct = [(p * pct) / 100]; distractors = [correct[0] + p / 10, Math.max(1, correct[0] - p / 10), correct[0] + 5];
  }

  // Build 4 options: correct first, then shuffle.
  const values = [...new Set([...correct, ...distractors])].slice(0, 4);
  while (values.length < 4) values.push(values[values.length - 1]! + 3);
  const options = values.map((v) => ({ text: String(v) }));
  // Shuffle options, track correct indexes.
  const order = options.map((_, i) => i).sort(() => rnd() - 0.5);
  const shuffled = order.map((i) => options[i]!);
  const correctIndexes = order
    .map((origIdx, newIdx) => (values[origIdx] === correct[0] ? newIdx : -1))
    .filter((i) => i >= 0);
  return { text: `Q${n}. ${text}`, options: shuffled, correctIndexes };
}

async function main() {
  await connectDB();
  const admin = await User.findOne({ username: 'admin' });
  if (!admin) throw new Error('admin user not found');

  for (const set of [1, 2]) {
    const exam = await createExam({
      title: `Exam ${set} — 1000-question bank`,
      description: `Practice exam ${set}: 1000-question bank, students draw a shuffled 100 in 5 minutes.`,
      timerMinutes: TIMER_MINUTES,
      questionsToServe: SERVE,
      createdBy: String(admin._id),
    } as never);

    const rnd = mulberry32(1000 + set);
    const docs: Record<string, unknown>[] = [];
    for (let i = 0; i < BANK; i++) {
      const difficulty = (i % 5) + 1; // exactly 200 per level
      const q = makeQuestion(rnd, (i % 5) + 1, i + 1);
      const temp = new Question({
        examId: exam._id,
        text: q.text,
        options: q.options,
        isActive: true,
        correctOptionIds: [],
      });
      temp.correctOptionIds = q.correctIndexes.map(
        (idx) => temp.options[idx]!._id as never,
      );
      docs.push(temp.toObject());
    }
    await Question.insertMany(docs);
    console.log(`exam ${set}: ${exam._id} with ${docs.length} questions`);

    await publishExam(String(exam._id), String(admin._id), 'admin');
    const fresh = await Exam.findById(exam._id).lean();
    console.log(`exam ${set} status: ${fresh?.status}`);
  }

  console.log('done');
  await disconnectDB();
}

main().catch(async (err) => {
  console.error('generate failed:', err);
  await disconnectDB();
  process.exit(1);
});
