import { useState, useEffect } from 'react'
import { FileText, Activity, Clock, Stethoscope, Calendar, UserCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { getHealthSync } from '../utils/healthSync'

const quickActions = [
    { icon: FileText, label: 'Scan Report / रिपोर्ट स्कैन', path: '/report', color: '#06b6d4' },
    { icon: Activity, label: 'Risk Check / जोखिम जांच', path: '/risk', color: '#f59e0b' },
    { icon: UserCircle, label: 'Health Twin / स्वास्थ्य ट्विन', path: '/twin', color: '#8b5cf6' },
    { icon: Calendar, label: 'Visit Planner / विज़िट योजना', path: '/visits', color: '#3b82f6' },
]

export default function Dashboard() {
    const navigate = useNavigate()
    const { user, token } = useAuth()
    const [stats, setStats] = useState([
        { icon: '📄', label: 'Reports Scanned', value: '0', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
        { icon: '📊', label: 'Latest Risk', value: '—', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    ])
    const [activities, setActivities] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const headers = token ? { Authorization: `Bearer ${token}` } : {}
                const [statsRes, activityRes] = await Promise.all([
                    fetch('/api/dashboard/stats', { headers }),
                    fetch('/api/dashboard/activity', { headers }),
                ])

                const sync = user?.id ? getHealthSync(user.id) : {}
                const hs = user?.health_stats || {}
                if (statsRes.ok) {
                    const data = await statsRes.json()
                    const riskVal = hs.combined_risk ?? hs.latest_risk_score ?? sync.risk?.combined_risk ?? sync.latestReport?.risk_score
                    setStats([
                        { icon: '📄', label: 'Reports Scanned', value: String(data.reports ?? hs.total_reports ?? 0), color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
                        { icon: '📊', label: 'Latest Risk', value: riskVal != null ? `${Math.round(riskVal)}%` : '—', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
                    ])
                }

                if (activityRes.ok) {
                    const data = await activityRes.json()
                    setActivities(data)
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [user, token])

    const formatTime = (isoString) => {
        if (!isoString) return ''
        const date = new Date(isoString)
        const now = new Date()
        const diffInMs = now - date
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
        const diffInDays = Math.floor(diffInHours / 24)

        if (diffInHours < 1) return 'Just now'
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    }

    return (
        <div>
            {/* Welcome banner */}
            <div className="glass-card glow-teal animate-in" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.08))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                            🏥 Welcome to HealthMitra Scan / हेल्थमित्र
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                            Scan reports, predict health risks, and sync everything to your Health Twin automatically.
                        </p>
                    </div>
                    <div style={{ fontSize: 64, opacity: 0.3 }}>
                        <Stethoscope size={80} strokeWidth={1} />
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid-4 animate-in" style={{ marginBottom: 24 }}>
                {stats.map((s, i) => (
                    <div key={i} className="glass-card stat-card">
                        <div className="stat-icon" style={{ background: s.bg }}>
                            <span style={{ fontSize: 20 }}>{s.icon}</span>
                        </div>
                        <div className="stat-value" style={{ color: s.color }}>{loading ? '...' : s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="page-header animate-in">
                <h2 style={{ fontSize: 18 }}>⚡ Quick Actions</h2>
            </div>
            <div className="grid-3 animate-in" style={{ marginBottom: 28 }}>
                {quickActions.map((a, i) => {
                    const Icon = a.icon
                    return (
                        <button
                            key={i}
                            className="glass-card"
                            onClick={() => navigate(a.path)}
                            style={{
                                cursor: 'pointer', textAlign: 'left', border: '1px solid var(--border-glass)',
                                transition: 'all 0.25s ease', color: 'var(--text-primary)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.transform = 'translateY(-4px)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.transform = 'translateY(0)' }}
                        >
                            <div style={{
                                width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `${a.color}18`, marginBottom: 12
                            }}>
                                <Icon size={20} color={a.color} />
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 600 }}>{a.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Click to open →</div>
                        </button>
                    )
                })}
            </div>

            {/* Recent Activity */}
            <div className="glass-card animate-in">
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={18} /> Recent Activity
                </h3>
                <div className="timeline">
                    {loading ? (
                        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading activity...</div>
                    ) : activities.length === 0 ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>🌱</div>
                            <p>No activity yet. Start by scanning a medical report.</p>
                        </div>
                    ) : (
                        activities.map((a, i) => (
                            <div key={i} className={`timeline-item ${a.risk_score >= 60 ? 'critical' : a.risk_score >= 30 ? 'warning' : ''}`}>
                                <div className="tl-title">{a.title}</div>
                                <div className="tl-desc">{a.desc}</div>
                                <div className="tl-date">{formatTime(a.created_at)}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
