import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { FACE_STATUS } from '../config/constants.js';

const studentSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    studentCode: { type: String, required: true, unique: true, trim: true, index: true },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0, select: false },
    face: {
      status: { type: String, enum: Object.values(FACE_STATUS), default: FACE_STATUS.NOT_ENROLLED, index: true },
      embedding: { type: [Number], select: false },
      photoKey: { type: String },
      enrolledAt: { type: Date },
      enrolledBy: { type: Schema.Types.ObjectId, ref: 'User' },
      qualityScore: { type: Number },
      model: { type: String },
      /**
       * Look-alike cluster: other enrolled students whose embedding is
       * within the match threshold of this student's (siblings/twins,
       * detected at enrollment). Flagged students always go through
       * admin verification (Verification tab) instead of the kiosk.
       */
      lookalikeWith: { type: [{ type: Schema.Types.ObjectId, ref: 'Student' }], default: [] },
    },
    faceConsentAt: { type: Date },
    faceConsentVersion: { type: String },
  },
  { timestamps: true },
);

export type StudentAttrs = InferSchemaType<typeof studentSchema>;
export type StudentDoc = HydratedDocument<StudentAttrs>;
export const Student = model('Student', studentSchema);
