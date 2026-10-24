import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import Notices from './pages/Notices'
import Events from './pages/Events'
import Opportunities from './pages/Opportunities'
import Applications from './pages/Applications'
import Complaints from './pages/Complaints'
import AITools from './pages/AITools'
import PlacementPrep from './pages/PlacementPrep'

function ProtectedRoute({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />

      <Route path="/notices" element={<ProtectedRoute><Notices /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
      <Route path="/opportunities" element={<ProtectedRoute><Opportunities /></ProtectedRoute>} />
      <Route path="/applications" element={<ProtectedRoute role="student"><Applications /></ProtectedRoute>} />
      <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
      <Route path="/ai-tools" element={<ProtectedRoute role="teacher"><AITools /></ProtectedRoute>} />
      <Route path="/placement-prep" element={<ProtectedRoute role="student"><PlacementPrep /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
