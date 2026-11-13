import mongoose, { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ROLES } from '../config/constants.js';

/**
 * Staff user (admin or teacher). Distinct from `Student`, which is
 * identity-only and never holds a password.
 */
const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.TEACHER,
      required: true,
    },
    isActive: { type: Boolean, default: true },

    /**
     * Revocation counter for refresh tokens. The current value is baked
     * into every refresh token as the `tv` claim; bumping it instantly
     * invalidates every refresh token issued before the bump
     * (password change, "log out everywhere", suspected compromise).
     */
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserAttrs>;

export const User = model('User', userSchema);
