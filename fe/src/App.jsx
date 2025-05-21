import { BrowserRouter, Routes, Route, createBrowserRouter, RouterProvider, createRoutesFromElements, Navigate } from 'react-router-dom'
import Dashboard from "./pages/Dashboard"
import DebatePage from "./pages/DebatePage"
import ProfilePage from "./pages/ProfilePage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import AuthCallback from "./pages/AuthCallback"
import MyDebatesPage from "./pages/MyDebatesPage"
import SettingsPage from "./pages/SettingsPage"
import { ThemeProvider } from "./components/theme-provider"
import { AuthProvider, useAuth } from "./lib/auth-context"
import { SocketProvider } from './lib/socket-context'
import { Toaster } from 'sonner'
import "./index.css"

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route 
        path="/debate/:id" 
        element={
          <ProtectedRoute>
            <DebatePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/my-debates" 
        element={
          <ProtectedRoute>
            <MyDebatesPage />
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
    </Route>
  ),
  {
    future: {
      v7_startTransition: true
    }
  }
)

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <SocketProvider>
          <Toaster position="top-right" />
          <RouterProvider router={router} />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
