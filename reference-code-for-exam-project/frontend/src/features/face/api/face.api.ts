import { client } from "../../../shared/api";

export interface IdentifyResult {
  ownerType: "Student";
  student: { id: string; fullName: string; studentCode: string; isActive: boolean; createdAt: string; updatedAt: string };
  exam: { id: string; title: string; timerMinutes: number };
  attempt: unknown;
  assurance: { score: number; gap: number; model: string };
}

export const faceApi = {
  identify: (imageBase64: string, examId: string) =>
    client<{ success: true; data: IdentifyResult }>("/face/identify", {
      method: "POST",
      body: JSON.stringify({ imageBase64, examId }),
    }),
  enroll: (studentId: string, imageBase64: string) =>
    client<{ success: true; data: { ok: boolean; quality: number; model: string } }>("/face/enroll", {
      method: "POST",
      body: JSON.stringify({ studentId, imageBase64, consent: true }),
    }),
  photo: (studentId: string) =>
    client<{ success: true; data: { url: string; key: string } }>(`/face/${studentId}/photo`),
  createVerifyRequest: (examId: string, studentCode: string, imageBase64: string) =>
    client<{ success: true; data: { requestId: string; claimToken: string; status: string; expiresAt: string } }>("/face/verify-request", {
      method: "POST",
      body: JSON.stringify({ examId, studentCode, imageBase64 }),
    }),
  pollVerifyRequest: (requestId: string, token: string) =>
    client<{ success: true; data: any }>(`/face/verify-request/${requestId}/status`, {
      headers: { "x-claim-token": token },
    }),
  verifyRequests: () =>
    client<{ success: true; data: any[] }>("/face/verify-requests"),
  decideVerifyRequest: (requestId: string, action: "approve" | "deny") =>
    client<{ success: true; data: { id: string; status: string } }>(`/face/verify-requests/${requestId}/${action}`, { method: "POST" }),
  revoke: (studentId: string) =>
    client<{ success: true; data: { ok: boolean } }>(`/face/${studentId}/revoke`, { method: "DELETE" }),
  audit: () =>
    client<{ success: true; data: unknown[] }>("/face/audit"),
  reverify: () =>
    client<{ success: false; error: { code: string; message: string } }>("/face/reverify", { method: "POST" }),
};
