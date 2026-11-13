import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { faceApi } from "../api/face.api";
import { useNavigate } from "react-router-dom";
import { client } from "../../../shared/api";

export function useIdentify() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ imageBase64, examId }: { imageBase64: string; examId: string }) =>
      faceApi.identify(imageBase64, examId),
    onSuccess: async (res) => {
      try {
        await client("/auth/me");
      } catch { /* cookies already set */ }
      const attempt = (res?.data as unknown as { attempt?: { id?: string } } | undefined)?.attempt;
      if (attempt?.id) navigate(`/exam/${attempt.id}`);
      else navigate("/exams");
    },
  });
}

export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, imageBase64 }: { studentId: string; imageBase64: string }) =>
      faceApi.enroll(studentId, imageBase64),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useRevoke() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => faceApi.revoke(studentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });
}

/** Enrollment photo (staff-only presigned URL). 404 = no photo yet. */
export function useFacePhoto(studentId: string | null) {
  return useQuery({
    queryKey: ["face-photo", studentId],
    queryFn: () => faceApi.photo(studentId as string),
    enabled: !!studentId,
    retry: false,
    staleTime: 60_000,
  });
}
