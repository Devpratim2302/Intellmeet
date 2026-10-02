import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { CreateMeetingPage } from './pages/CreateMeetingPage';
import { JoinMeetingPage } from './pages/JoinMeetingPage';
import { MeetingRoomPage } from './pages/MeetingRoomPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { TasksPage } from './pages/TasksPage';
import { PostMeetingDashboardPage } from './pages/PostMeetingDashboardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col">
            <Navbar />
            <div className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/meetings"
                  element={
                    <ProtectedRoute>
                      <MeetingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/meetings/create"
                  element={
                    <ProtectedRoute>
                      <CreateMeetingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/meetings/join"
                  element={
                    <ProtectedRoute>
                      <JoinMeetingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/meetings/:roomId"
                  element={
                    <ProtectedRoute>
                      <MeetingRoomPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/meetings/:roomId/dashboard"
                  element={
                    <ProtectedRoute>
                      <PostMeetingDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tasks"
                  element={
                    <ProtectedRoute>
                      <TasksPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/workspaces"
                  element={
                    <ProtectedRoute>
                      <WorkspacesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
