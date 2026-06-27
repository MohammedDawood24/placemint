import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Shell from './components/Shell'

export default function App() {
  const { userData, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public login routes — each role gets its own URL */}
      <Route path="/" element={userData ? <Navigate to="/dashboard" /> : <Login portalRole="student" />} />
      <Route path="/department" element={userData ? <Navigate to="/dashboard" /> : <Login portalRole="hod" />} />
      <Route path="/company" element={userData ? <Navigate to="/dashboard" /> : <Login portalRole="company" />} />
      <Route path="/admin" element={userData ? <Navigate to="/dashboard" /> : <Login portalRole="admin" />} />

      {/* Student registration */}
      <Route path="/register" element={userData ? <Navigate to="/dashboard" /> : <Register />} />

      {/* Protected app shell — sidebar + content */}
      <Route path="/dashboard/*" element={userData ? <Shell /> : <Navigate to="/" />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
