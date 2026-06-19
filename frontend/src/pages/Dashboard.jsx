import { useState, useEffect } from 'react'
import { FileText, Activity, Clock, Stethoscope, Calendar, UserCircle, MapPin, Droplets, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { getHealthSync } from '../utils/healthSync'

const quickActions = [
  { icon: FileText, labelEn: 'Scan Report', path: '/report', color: '#06b6d4' },
  { icon: Activity, labelEn: 'Risk Check', path: '/risk', color: '#f59e0b' },
  { icon: UserCircle, labelEn: 'Health Twin', path: '/twin', color: '#8b5cf6' },
  { icon: Calendar, labelEn: 'Visit Planner', path: '/visits', color: '#3b82f6' },
]

const urgencyClass = (u) => {
  if (u === 'critical') return 'urgency-critical'
  if (u === 'warning') return 'urgency-warning'
  if (u === 'normal') return 'urgency-normal'
  return ''
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
const [dashData, setDashData] = useState(null)
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

        if (statsRes.ok) {
          setDashData(await statsRes.json())
        }
        if (activityRes.ok) {
          setActivities(await activityRes.json())
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
    const onUpdate = () => fetchDashboardData()
    window.addEventListener('hm-health-updated', onUpdate)
    return () => window.removeEventListener('hm-health-updated', onUpdate)
  }, [user, token])

  const sync = user?.id ? getHealthSync(user.id) : {}
  const hs = user?.health_stats || {}
  const riskVal = hs.combined_risk ?? hs.latest_risk_score ?? sync.risk?.combined_risk ?? sync.latestReport?.risk_score
  const profile = dashData?.profile || {}
  const nextVisit = dashData?.next_visit
  const urgency = dashData?.visit_urgency || 'none'

  const formatTime = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} ${'hour(s) ago'}`
    return `${diffInDays} ${'day(s) ago'}`
  }

  const formatVisitDate = (iso) => {
    if (!iso) return 'Not scheduled'
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const stats = [
    {
      icon: '📅',
      label: 'Visit Tracker',
      value: loading ? '...' : String(dashData?.upcoming_visits ?? 0),
      sub: nextVisit ? formatVisitDate(nextVisit.visit_date) : 'No upcoming visits',
      color: urgency === 'critical' ? '#ef4444' : urgency === 'warning' ? '#f59e0b' : '#10b981',
      bg: urgency === 'critical' ? 'rgba(239,68,68,0.12)' : urgency === 'warning' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
      urgencyClass: urgencyClass(urgency),
      onClick: () => navigate('/visits'),
    },
    {
      icon: '📊',
      label: 'Latest Risk',
      value: loading ? '...' : (riskVal != null ? `${Math.round(riskVal)}%` : '—'),
      sub: hs.latest_risk_level ? hs.latest_risk_level.toUpperCase() : 'Run risk check',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
      onClick: () => navigate('/risk'),
    },
    {
      icon: '🩸',
      label: 'Blood Group',
      value: profile.blood_group || user?.blood_group || '—',
      sub: 'From profile',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.1)',
      onClick: () => navigate('/profile'),
    },
    {
      icon: '🎂',
      label: 'Age',
      value: profile.age || user?.age ? String(profile.age || user.age) : '—',
      sub: user?.village || profile.village || 'Set in profile',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.12)',
      onClick: () => navigate('/profile'),
    },
  ]

  return (
    <div>
      <div className="glass-card glow-teal animate-in" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.08))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              {'Welcome to HealthMitra Scan'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
              {'Scan reports, predict health risks, and sync everything to your Health Twin automatically.'}
            </p>
          </div>
          <div style={{ fontSize: 64, opacity: 0.3 }}>
            <Stethoscope size={80} strokeWidth={1} />
          </div>
        </div>
      </div>

      <div className="grid-4 animate-in" style={{ marginBottom: 24 }}>
        {stats.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`glass-card stat-card visit-tracker-card ${s.urgencyClass || ''}`}
            style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border-glass)' }}
            onClick={s.onClick}
          >
            <div className="stat-icon" style={{ background: s.bg }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
            </div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.sub}</div>
          </button>
        ))}
      </div>

      {nextVisit && (
        <div className={`glass-card animate-in visit-tracker-card ${urgencyClass(urgency)}`} style={{ marginBottom: 24, padding: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color={urgency === 'critical' ? '#ef4444' : '#f59e0b'} />
            {'Next Visit'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, fontSize: 13 }}>
            <div><Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{formatVisitDate(nextVisit.visit_date)}</div>
            <div><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{nextVisit.village_name || '—'}</div>
            <div>{'Purpose'}: {nextVisit.purpose}</div>
          </div>
        </div>
      )}

      <div className="page-header animate-in">
        <h2 style={{ fontSize: 18 }}>{'Quick Actions'}</h2>
      </div>
      <div className="grid-3 animate-in" style={{ marginBottom: 28 }}>
        {quickActions.map((a, i) => {
          const Icon = a.icon
          return (
            <button
              key={i}
              className="glass-card"
              onClick={() => navigate(a.path)}
              style={{ cursor: 'pointer', textAlign: 'left', border: '1px solid var(--border-glass)', transition: 'all 0.25s ease', color: 'var(--text-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${a.color}18`, marginBottom: 12 }}>
                <Icon size={20} color={a.color} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{a.labelEn}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{'Click to open →'}</div>
            </button>
          )
        })}
      </div>

      <div className="glass-card animate-in">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} /> {'Recent Activity'}
        </h3>
        <div className="timeline">
          {loading ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>{'Loading activity...'}</div>
          ) : activities.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🌱</div>
              <p>{'No activity yet. Start by scanning a medical report.'}</p>
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
