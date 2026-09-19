import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CompliancePage from "./pages/CompliancePage";
import ProcessBalancingPage from "./pages/ProcessBalancingPage";
import MyPage from "./pages/MyPage";
import SafetyMonitorPage from "./pages/SafetyMonitorPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/process-balancing" element={<ProcessBalancingPage />} />
          <Route path="/safety-monitor" element={<SafetyMonitorPage />} />
          <Route path="/mypage" element={<MyPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
