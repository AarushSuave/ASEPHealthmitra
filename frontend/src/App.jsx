import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import {
    LayoutDashboard, FileText, Activity, Clock, UserCircle, Users, Cpu, Wifi, ScanLine, MessageSquareHeart, CircleHelp, Moon, Sun
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import ReportExplainer from './pages/ReportExplainer'
import RiskPredictor from './pages/RiskPredictor'
import HealthMemory from './pages/HealthMemory'
import HealthTwin from './pages/HealthTwin'
import RuralMode from './pages/RuralMode'
import XrayAgent from './pages/XrayAgent'
import AIMitra from './pages/AIMitra'
import RespiratoryFaqs from './pages/RespiratoryFaqs'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import healthmitraLogo from './assets/healthmitra-logo.jpeg'

const navItems = [
    { section: 'Core Features' },
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/report', icon: FileText, label: 'Report Explainer' },
    { path: '/xray', icon: ScanLine, label: 'X-Ray AI Agent', badge: 'NEW' },
    { section: 'Health Intelligence' },
    { path: '/risk', icon: Activity, label: 'Risk Predictor' },
    { path: '/memory', icon: Clock, label: 'Health Memory' },
    { path: '/ai-mitra', icon: MessageSquareHeart, label: 'HealthMitra AI', badge: 'AI' },
    { path: '/respiratory-faqs', icon: CircleHelp, label: 'Lung FAQs' },
    { path: '/twin', icon: UserCircle, label: 'AI Health Twin' },
    { section: 'Special Modes' },
    { path: '/rural', icon: Users, label: 'Rural ASHA Mode' },
]

const pageTitles = {
    '/': 'Dashboard',
    '/report': 'Medical Report Explainer',
    '/xray': 'X-Ray Sequential AI Agent',
    '/risk': 'Future Risk Predictor',
    '/memory': 'Health Memory',
    '/ai-mitra': 'HealthMitra AI Chat',
    '/respiratory-faqs': 'Breathing And Lung FAQs',
    '/twin': 'AI Health Twin',
    '/rural': 'Rural ASHA Worker Mode',
    '/profile': 'My Profile',
}

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <div className="loading-container"><span className="spinner" /> Loading...</div>
    if (!user) return <Navigate to="/login" replace />
    return children
}

export default function App() {
    const location = useLocation()
    const { user, logout } = useAuth()
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme_mode')
        return savedTheme === 'light' ? 'light' : 'dark'
    })
    const [isOffline, setIsOffline] = useState(() => {
        const saved = localStorage.getItem('app_mode')
        return saved === null ? true : saved === 'offline'
    })

    useEffect(() => {
        document.documentElement.dataset.theme = theme
        localStorage.setItem('theme_mode', theme)
    }, [theme])

    useEffect(() => {
        localStorage.setItem('app_mode', isOffline ? 'offline' : 'online')
    }, [isOffline])

    const toggleMode = () => setIsOffline(!isOffline)
    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

    const currentTitle = pageTitles[location.pathname] || 'HealthMitra Scan'

    // Auth pages – no sidebar / header
    if (location.pathname === '/login' || location.pathname === '/signup') {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
            </Routes>
        )
    }

    const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-icon">
                        <img src={healthmitraLogo} alt="HealthMitra logo" className="logo-image" />
                    </div>
                    <div>
                        <h1>HealthMitra</h1>
                        <div className="logo-subtitle">AI Health Scan</div>
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
                                    {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                                </NavLink>
                            </div>
                        )
                    })}
                </nav>

                {/* User profile in sidebar footer */}
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
                    <button
                        className={`status-badge ${isOffline ? 'offline' : 'online'}`}
                        style={{ marginTop: 8, width: '100%' }}
                        onClick={toggleMode}
                        title={`Switch to ${isOffline ? 'Online' : 'Offline'} Mode`}
                    >
                        <span className="dot"></span>
                        {isOffline ? <Wifi size={14} /> : <Wifi size={14} style={{ opacity: 0.7 }} />}
                        {isOffline ? 'Offline Mode Active' : 'Online Mode Active'}
                    </button>
                </div>
            </aside>

            {/* Header */}
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
                    <div className="header-chip local-ai">
                        <Cpu size={14} />
                        Offline AI Engine
                    </div>
                    <button
                        className={`header-chip status-btn ${isOffline ? 'offline' : 'online'}`}
                        onClick={toggleMode}
                        title={`Switch to ${isOffline ? 'Online' : 'Offline'} Mode`}
                    >
                        <span className="dot"></span>
                        {isOffline ? 'Offline' : 'Online'}
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

            {/* Main Content */}
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/report" element={<ProtectedRoute><ReportExplainer /></ProtectedRoute>} />
                    <Route path="/xray" element={<ProtectedRoute><XrayAgent /></ProtectedRoute>} />
                    <Route path="/risk" element={<ProtectedRoute><RiskPredictor /></ProtectedRoute>} />
                    <Route path="/memory" element={<ProtectedRoute><HealthMemory /></ProtectedRoute>} />
                    <Route path="/ai-mitra" element={<ProtectedRoute><AIMitra /></ProtectedRoute>} />
                    <Route path="/respiratory-faqs" element={<ProtectedRoute><RespiratoryFaqs /></ProtectedRoute>} />
                    <Route path="/twin" element={<ProtectedRoute><HealthTwin /></ProtectedRoute>} />
                    <Route path="/rural" element={<ProtectedRoute><RuralMode /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    )
}
