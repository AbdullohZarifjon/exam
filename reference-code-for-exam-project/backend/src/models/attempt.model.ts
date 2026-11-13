import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ATTEMPT_STATUS, BUSINESS_RULES } from '../config/constants.js';

const OptionSnapshotSchema = new Schema({ text: { type: String, required: true } }, { _id: true });

const AttemptQuestionSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    text: { type: String, required: true },
    options: { type: [OptionSnapshotSchema], required: true },
    correctOptionIds: { type: [Schema.Types.ObjectId], required: true },
    givenOptionIds: { type: [Schema.Types.ObjectId], default: [] },
    isCorrect: { type: Boolean, default: null },
    answeredAt: { type: Date },
  },
  { _id: false },
);

const attemptSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    identityAssurance: {
      method: { type: String, default: 'face' },
      verifiedAt: { type: Date },
      score: { type: Number },
      gap: { type: Number },
      model: { type: String },
    },
    identityFlags: {
      type: [{ at: Date, type: String, resolved: Boolean }],
      default: [],
    },
    // Every entry into this attempt (initial + each re-entry after a
    // disconnect/power outage), with how the student authenticated.
    // The student may re-enter the SAME attempt while time remains.
    entryLog: {
      type: [
        {
          at: { type: Date, required: true, default: () => new Date() },
          method: { type: String, required: true },
          score: { type: Number },
          gap: { type: Number },
          model: { type: String },
          staffId: { type: String },
        },
      ],
      default: [],
    },
    status: { type: String, enum: Object.values(ATTEMPT_STATUS), default: ATTEMPT_STATUS.IN_PROGRESS, index: true },
    durationMinutes: { type: Number, required: true },
    startedAt: { type: Date, required: true, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date },
    questions: {
      type: [AttemptQuestionSchema],
      validate: { validator: (v: unknown[]) => Array.isArray(v) && v.length <= BUSINESS_RULES.MAX_QUESTIONS_PER_EXAM, message: 'An attempt cannot contain more than 100 questions.' },
    },
    totalQuestions: { type: Number },
    totalCorrect: { type: Number },
    maxScore: { type: Number },
    score: { type: Number },
    scorePercent: { type: Number },
    resultToken: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true },
);

attemptSchema.index({ examId: 1, studentId: 1 });
attemptSchema.index({ examId: 1, studentId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: ATTEMPT_STATUS.IN_PROGRESS } });

export type AttemptAttrs = InferSchemaType<typeof attemptSchema>;
export type AttemptDoc = HydratedDocument<AttemptAttrs>;
export const Attempt = model('Attempt', attemptSchema);
export const toObjectId = (id: string) => new Types.ObjectId(id);
