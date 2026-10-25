
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { useApp } from "./context/useApp.js";

import Welcome from "./pages/Welcome.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewCase from "./pages/NewCase.jsx";
import CaseDetail from "./pages/CaseDetail.jsx";

import {
  ActivityPage,
  CasesPage,
  EvidencePage,
  HelpPage,
  SettingsPage,
} from "./pages/UtilityPages.jsx";

function ProtectedLayout() {
  const { user } = useApp();

  return user ? <Layout /> : <Navigate to="/welcome" replace />;
}

export default function App() {
  const { user } = useApp();

  return (
    <Routes>
      <Route
        path="/welcome"
        element={
          user ? <Navigate to="/" replace /> : <Welcome />
        }
      />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/cases/:caseId" element={<CaseDetail />} />
        <Route path="/new-case" element={<NewCase />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/help" element={<HelpPage />} />
      </Route>

      <Route
        path="*"
        element={
          <Navigate to={user ? "/" : "/welcome"} replace />
        }
      />
    </Routes>
  );
}
