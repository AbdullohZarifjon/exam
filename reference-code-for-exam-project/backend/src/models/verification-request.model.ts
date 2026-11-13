import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const VERIFY_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DENIED: 'denied',
  EXPIRED: 'expired',
  CLAIMED: 'claimed',
} as const;

const verificationRequestSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    studentCode: { type: String, required: true, trim: true },
    // Face-scan candidates at request time (look-alike rival visibility).
    candidates: {
      type: [{ studentId: { type: Schema.Types.ObjectId, ref: 'Student' }, score: { type: Number } }],
      default: [],
    },
    // Live selfie captured at the kiosk. Deleted 7 days after the
    // decision (approve/deny/expiry) via `ttlAt` + the cleanup sweep.
    photoKey: { type: String },
    status: {
      type: String,
      enum: Object.values(VERIFY_REQUEST_STATUS),
      default: VERIFY_REQUEST_STATUS.PENDING,
      index: true,
    },
    // Pending requests expire 10 minutes after creation.
    expiresAt: { type: Date, required: true },
    // Mongo TTL: the whole request (incl. photo reference) is deleted
    // 7 days after the decision. The audit trail lives on in
    // BiometricEvent, which is never TTL'd.
    ttlAt: { type: Date },
    claimTokenHash: { type: String, required: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
  },
  { timestamps: true },
);

verificationRequestSchema.index({ ttlAt: 1 }, { expireAfterSeconds: 0 });
verificationRequestSchema.index({ status: 1, createdAt: -1 });

export type VerificationRequestAttrs = InferSchemaType<typeof verificationRequestSchema>;
export type VerificationRequestDoc = HydratedDocument<VerificationRequestAttrs>;
export const VerificationRequest = model('VerificationRequest', verificationRequestSchema);
