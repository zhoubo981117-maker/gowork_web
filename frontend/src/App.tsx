import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import ToastContainer from "./components/Toast";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import BoardPage from "./pages/BoardPage";
import AnalysisPage from "./pages/AnalysisPage";
import InterviewPage from "./pages/InterviewPage";
// ScraperPage removed
import SettingsPage from "./pages/SettingsPage";
import InterviewHistoryPage from "./pages/InterviewHistoryPage";
import InterviewPrepPage from "./pages/InterviewPrepPage";
import ComparePage from "./pages/ComparePage";
import type { ReactNode } from "react";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/board"
            element={
              <ProtectedRoute>
                <BoardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <ProtectedRoute>
                <AnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview"
            element={
              <ProtectedRoute>
                <InterviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/history"
            element={
              <ProtectedRoute>
                <InterviewHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compare"
            element={
              <ProtectedRoute>
                <ComparePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/prep"
            element={
              <ProtectedRoute>
                <InterviewPrepPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/board" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
