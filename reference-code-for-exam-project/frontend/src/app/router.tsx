import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import { AppShell } from "./layouts/AppShell";
import { AuthLayout } from "./layouts/AuthLayout";
import { RouteErrorBoundary } from "./errors/RouteErrorBoundary";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ExamsListPage } from "../pages/ExamsListPage";
import { ExamDetailPage } from "../pages/ExamDetailPage";
import { QuestionBankPage } from "../pages/QuestionBankPage";
import { QuestionDetailPage } from "../pages/QuestionDetailPage";
import { SubmissionsPage } from "../pages/SubmissionsPage";
import { AttemptDetailPage } from "../pages/AttemptDetailPage";
import { StudentsPage } from "../pages/StudentsPage";
import { ExamRunnerPage } from "../pages/ExamRunnerPage";
import { ResultPage } from "../pages/ResultPage";
import { CandidateEntryPage } from "../pages/CandidateEntryPage";
import { EnrollPage } from "../pages/EnrollPage";
import { StaffPage } from "../pages/StaffPage";
import { VerificationPage } from "../pages/VerificationPage";
import { RequireAuth } from "../shared/auth/RequireAuth";
import { RequireRole } from "../shared/auth/RequireRole";

const router = createBrowserRouter([
  { path: "/", element: <CandidateEntryPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/candidate", element: <Navigate to="/" replace /> },
  { path: "/result/:token", element: <ResultPage />, errorElement: <RouteErrorBoundary /> },

  {
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/login", element: <LoginPage /> },
    ],
  },

  {
    // Management side (AppShell) is staff-only: students (exam-scoped
    // sessions) are redirected to the kiosk, never into the console.
    element: (
      <RequireAuth>
        <RequireRole roles={["admin", "teacher"]}>
          <AppShell />
        </RequireRole>
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/exams/:examId/questions", element: <QuestionBankPage /> },
      { path: "/exams/:examId/questions/:questionId", element: <QuestionDetailPage /> },
      { path: "/exams/:examId/submissions", element: <SubmissionsPage /> },
      { path: "/attempts/:id", element: <AttemptDetailPage /> },
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/exams", element: <ExamsListPage /> },
      { path: "/exams/new", element: <Navigate to="/exams" replace /> },
      { path: "/exams/:id", element: <ExamDetailPage /> },
      { path: "/students", element: <StudentsPage /> },
      { path: "/verification", element: <VerificationPage /> },
      {
        path: "/students/enroll",
        element: (
          <RequireRole roles={["admin"]}>
            <EnrollPage />
          </RequireRole>
        ),
      },
      {
        path: "/staff",
        element: (
          <RequireRole roles={["admin"]}>
            <StaffPage />
          </RequireRole>
        ),
      },
    ],
  },

  { path: "/exam/:attemptId", element: <ExamRunnerPage />, errorElement: <RouteErrorBoundary /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
