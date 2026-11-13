import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { BIOMETRIC_EVENT } from '../config/constants.js';

const biometricEventSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam' },
    attemptId: { type: Schema.Types.ObjectId, ref: 'Attempt', index: true },
    event: { type: String, enum: Object.values(BIOMETRIC_EVENT), required: true, index: true },
    score: { type: Number },
    gap: { type: Number },
    model: { type: String },
    ip: { type: String },
    ua: { type: String },
    detail: { type: String },
  },
  { timestamps: true },
);

biometricEventSchema.index({ createdAt: -1 });

export type BiometricEventAttrs = InferSchemaType<typeof biometricEventSchema>;
export type BiometricEventDoc = HydratedDocument<BiometricEventAttrs>;
export const BiometricEvent = model('BiometricEvent', biometricEventSchema);
