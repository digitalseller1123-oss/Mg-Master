import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import PublicCheck from "@/pages/PublicCheck";
import VerifyCert from "@/pages/VerifyCert";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Companies from "@/pages/Companies";
import Trainers from "@/pages/Trainers";
import Learners from "@/pages/Learners";
import Programming from "@/pages/Programming";
import Groups from "@/pages/Groups";
import Documents from "@/pages/Documents";
import Certificates from "@/pages/Certificates";
import Attendance from "@/pages/Attendance";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/consulta" element={<PublicCheck />} />
          <Route path="/verify/:cert_number" element={<VerifyCert />} />

          <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="companies" element={<ProtectedRoute roles={["super_admin"]}><Companies /></ProtectedRoute>} />
            <Route path="trainers" element={<ProtectedRoute roles={["super_admin"]}><Trainers /></ProtectedRoute>} />
            <Route path="learners" element={<ProtectedRoute roles={["super_admin", "empresa"]}><Learners /></ProtectedRoute>} />
            <Route path="programming" element={<ProtectedRoute roles={["super_admin", "empresa"]}><Programming /></ProtectedRoute>} />
            <Route path="groups" element={<Groups />} />
            <Route path="documents" element={<Documents />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="attendance" element={<ProtectedRoute roles={["super_admin", "entrenador"]}><Attendance /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
