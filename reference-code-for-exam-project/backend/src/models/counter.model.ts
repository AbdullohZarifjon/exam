import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Generic sequence holder for human-readable identifiers (currently the
 * student code). One document per key; the next number is reserved with
 * an atomic `findOneAndUpdate` + `$inc`, so concurrent creators can
 * never receive the same sequence value.
 */
const counterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0, min: 0 },
});

export type CounterAttrs = InferSchemaType<typeof counterSchema>;

export const Counter = model('Counter', counterSchema);