import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { EXAM_STATUS, BUSINESS_RULES } from '../config/constants.js';

const examSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: Object.values(EXAM_STATUS), default: EXAM_STATUS.DRAFT, index: true },
    timerMinutes: { type: Number, required: true, min: 1, max: BUSINESS_RULES.MAX_TIMER_MINUTES },
    questionsToServe: { type: Number, default: BUSINESS_RULES.MAX_QUESTIONS_PER_EXAM, min: BUSINESS_RULES.MIN_QUESTIONS_PER_EXAM, max: BUSINESS_RULES.MAX_QUESTIONS_PER_EXAM },
    passingScorePercent: { type: Number, min: 0, max: 100 },
    passingScorePoints: { type: Number, min: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

export type ExamAttrs = InferSchemaType<typeof examSchema>;
export type ExamDoc = HydratedDocument<ExamAttrs>;
export const Exam = model('Exam', examSchema);
