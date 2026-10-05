import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import {
  LoginPage,
  UnauthorizedPage,
  DashboardPage,
  CompaniesPage,
  ContactsPage,
  LeadsPage,
  FollowUpsPage,
  CampaignsPage,
  ReportsPage,
  SettingsPage,
} from './pages';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Authenticated & Protected Application Shell */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="follow-ups" element={<FollowUpsPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="reports" element={<ReportsPage />} />

              {/* Role-restricted route example: Settings requires admin or manager */}
              <Route
                path="settings"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'manager']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
