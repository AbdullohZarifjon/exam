/**
 * Centralized route paths. Use the ROUTES object everywhere instead of
 * hardcoding strings — gives a single source of truth and prevents
 * typos in <Link to={...}> / navigate(ROUTES.X).
 */
export const ROUTES = {
  // Public
  HOME: "/",
  LOGIN: "/login",

  // Staff
  DASHBOARD: "/dashboard",
  EXAMS: "/exams",
  EXAM_DETAIL: (id: string = ":id") => `/exams/${id}`,
  EXAM_QUESTIONS: (examId: string = ":examId") => `/exams/${examId}/questions`,
  EXAM_QUESTION_DETAIL: (examId: string = ":examId", qid: string = ":qid") => `/exams/${examId}/questions/${qid}`,
  EXAM_SUBMISSIONS: (examId: string = ":examId") => `/exams/${examId}/submissions`,
  ATTEMPT_DETAIL: (id: string = ":id") => `/attempts/${id}`,
  STUDENTS: "/students",
  STAFF: "/staff",
  // Face enrollment desk (staff)

  // Candidate entry (public, on the candidate's own device)
  CANDIDATE: "/candidate",
  // Student exam runner
  EXAM_RUNNER: (attemptId: string = ":attemptId") => `/exam/${attemptId}`,

  // Public result page
  RESULT: (token: string = ":token") => `/result/${token}`,
} as const;