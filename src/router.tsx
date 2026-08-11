import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AssessmentOverviewPage } from "./pages/AssessmentOverviewPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ClassDetailPage } from "./pages/ClassDetailPage";
import { ClassesPage } from "./pages/ClassesPage";
import { LoginPage } from "./pages/LoginPage";
import { StudentDetailPage } from "./pages/StudentDetailPage";
import { StudentsPage } from "./pages/StudentsPage";
import { SubjectOverviewPage } from "./pages/SubjectOverviewPage";
import { SubjectsPage } from "./pages/SubjectsPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "classes", element: <ClassesPage /> },
      { path: "students", element: <StudentsPage /> },
      { path: "students/:studentId", element: <StudentDetailPage /> },
      { path: "subjects", element: <SubjectsPage /> },
      { path: "subjects/:subjectId", element: <SubjectOverviewPage /> },
      { path: "classes/:classId", element: <ClassDetailPage /> },
      {
        path: "classes/:classId/subjects/:subjectId",
        element: <SubjectOverviewPage />,
      },
      {
        path: "classes/:classId/subjects/:subjectId/assessments/:assessmentId",
        element: <AssessmentOverviewPage />,
      },
      { path: "classes/:classId/students/:studentId", element: <StudentDetailPage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
