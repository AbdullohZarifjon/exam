import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * Upload tracking for the presigned-URL flow. The backend never touches
 * file bytes — it issues a PUT URL, then verifies the object landed
 * with a HEAD request on confirm.
 *
 * status is the garbage-control mechanism:
 *   pending     — PUT URL issued, client hasn't confirmed yet
 *   confirmed   — verified to exist in storage, safe to serve
 *   unconfirmed — was confirmed, then deleted (soft delete)
 */
const uploadSchema = new Schema(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    key: { type: String, required: true, unique: true },
    originalName: { type: String },
    extension: { type: String, required: true },
    contentType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'unconfirmed'],
      default: 'pending',
      index: true,
    },
    confirmedAt: { type: Date },
  },
  { timestamps: true },
);

uploadSchema.index({ entityType: 1, entityId: 1, status: 1 });

export type UploadAttrs = InferSchemaType<typeof uploadSchema>;
export type UploadDoc = HydratedDocument<UploadAttrs>;

export const Upload = model('Upload', uploadSchema);
