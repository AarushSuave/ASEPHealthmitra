import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import {
  LayoutDashboard, FileText, Activity, UserCircle, CircleHelp, Moon, Sun, Calendar, History
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import ReportExplainer from './pages/ReportExplainer'
import RiskPredictor from './pages/RiskPredictor'
import HealthTwin from './pages/HealthTwin'
import RuralMode from './pages/RuralMode'
import RespiratoryFaqs from './pages/RespiratoryFaqs'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import VisitPlanner from './pages/VisitPlanner'
import VisitsHistory from './pages/VisitsHistory'
import AdminLayout from './components/AdminLayout'
import AdminDashboard from './pages/AdminDashboard'
import AdminVillages from './pages/AdminVillages'
import AdminPatients from './pages/AdminPatients'
import AdminAppointments from './pages/AdminAppointments'
import healthmitraLogo from './assets/healthmitra-logo.jpeg'

const navItems = [
  { section: 'Core Features' },
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/report', icon: FileText, label: 'Report Scanner' },
  { section: 'Health Tools' },
  { path: '/risk', icon: Activity, label: 'Risk Predictor' },
  { path: '/respiratory-faqs', icon: CircleHelp, label: 'FAQs' },
  { path: '/twin', icon: UserCircle, label: 'Health Twin' },
  { section: 'Visits' },
  { path: '/visits', icon: Calendar, label: 'Visit Planner' },
  { path: '/history', icon: History, label: 'Visits History' },
]

const pageTitles = {
  '/': 'Health Dashboard',
  '/report': 'Medical Report Scanner',
  '/risk': 'Future Risk Predictor',
  '/respiratory-faqs': 'FAQs',
  '/twin': 'Health Twin',
  '/profile': 'My Profile',
  '/visits': 'Visit Planner',
  '/history': 'Previous Visits History',
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-container"><span className="spinner" /> Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const location = useLocation()
  const { user } = useAuth()
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme_mode')
    return savedTheme === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme_mode', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  const currentTitle = pageTitles[location.pathname] || 'HealthMitra Scan'

  if (location.pathname === '/login' || location.pathname === '/signup') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    )
  }

  if (user?.role === 'admin') {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="villages" element={<AdminVillages />} />
          <Route path="patients" element={<AdminPatients />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    )
  }

  if (user?.role === 'asha_coordinator') {
    return (
      <Routes>
        <Route path="/*" element={
          <ProtectedRoute>
            <RuralMode />
          </ProtectedRoute>
        } />
      </Routes>
    )
  }

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <img src={healthmitraLogo} alt="HealthMitra logo" className="logo-image" />
          </div>
          <div>
            <h1>HealthMitra</h1>
            <div className="logo-subtitle">Health Scan</div>
          </div>
        </div>

        <nav>
          {navItems.map((item, i) => {
            if (item.section) {
              return (
                <div key={i} className="sidebar-section">
                  <div className="sidebar-section-title">{item.section}</div>
                </div>
              )
            }
            const Icon = item.icon
            return (
              <div key={item.path} className="sidebar-section" style={{ padding: '2px 12px' }}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                  end={item.path === '/'}
                >
                  <Icon />
                  <span>{item.label}</span>
                </NavLink>
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <NavLink to="/profile" className="sidebar-user-card">
              {user.profile_photo ? (
                <img src={user.profile_photo} alt="" className="sidebar-avatar" />
              ) : (
                <div className="sidebar-avatar-fallback">{initials}</div>
              )}
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-email">{user.email}</div>
              </div>
            </NavLink>
          )}
        </div>
      </aside>

      <header className="header">
        <h2 className="header-title">{currentTitle}</h2>
        <div className="header-right">
          <button
            className="header-chip theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          {user && (
            <NavLink to="/profile" className="header-avatar-btn" title="My Profile">
              {user.profile_photo ? (
                <img src={user.profile_photo} alt="" className="header-avatar" />
              ) : (
                <div className="header-avatar-fallback">{initials}</div>
              )}
            </NavLink>
          )}
        </div>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportExplainer /></ProtectedRoute>} />
          <Route path="/risk" element={<ProtectedRoute><RiskPredictor /></ProtectedRoute>} />
          <Route path="/memory" element={<Navigate to="/" replace />} />
          <Route path="/respiratory-faqs" element={<ProtectedRoute><RespiratoryFaqs /></ProtectedRoute>} />
          <Route path="/twin" element={<ProtectedRoute><HealthTwin /></ProtectedRoute>} />
          <Route path="/rural" element={<Navigate to="/" replace />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/visits" element={<ProtectedRoute><VisitPlanner /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><VisitsHistory /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
