export type FaceStatus = "not-enrolled" | "enrolled" | "revoked";

export interface CaptureFrame {
  imageBase64: string;
  quality: number;
}
