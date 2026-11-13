import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { BUSINESS_RULES } from '../config/constants.js';

const OptionSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
  },
  { _id: true },
);

const questionSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },

    text: { type: String, required: true, trim: true },

    options: {
      type: [OptionSchema],
      required: true,
      validate: {
        validator: (v: unknown[]) =>
          Array.isArray(v) && v.length === BUSINESS_RULES.OPTIONS_PER_QUESTION,
        message: 'A question needs exactly 4 options.',
      },
    },

    correctOptionIds: {
      type: [Schema.Types.ObjectId],
      required: true,
      validate: {
        validator: (v: unknown[]) => Array.isArray(v) && v.length >= 1,
        message: 'At least one correct option is required.',
      },
    },

    explanation: { type: String, trim: true },
    imageUrl: { type: String, trim: true },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export type QuestionAttrs = InferSchemaType<typeof questionSchema>;
export type QuestionDoc = HydratedDocument<QuestionAttrs>;

export const Question = model('Question', questionSchema);
