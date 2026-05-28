import { useState, useEffect } from 'react'
import { Clock, FileText, Camera, Activity, AlertTriangle, TrendingUp } from 'lucide-react'

const iconMap = { report: FileText, scan: Camera, alert: AlertTriangle, vitals: Activity }
const colorMap = { report: '#06b6d4', scan: '#10b981', alert: '#ef4444', vitals: '#8b5cf6' }

export default function HealthMemory() {
    const [timeline, setTimeline] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        const fetchTimeline = async () => {
            try {
                const res = await fetch('/api/dashboard/timeline')
                if (res.ok) {
                    const data = await res.json()
                    setTimeline(data)
                }
            } catch (error) {
                console.error("Failed to fetch timeline:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchTimeline()
    }, [])

    const filtered = filter === 'all' ? timeline : timeline.filter(t => t.event_type === filter)

    const stats = {
        reports: timeline.filter(t => t.event_type === 'report').length,
        scans: timeline.filter(t => t.event_type === 'scan').length,
        alerts: timeline.filter(t => t.event_type === 'alert').length,
        avgRisk: timeline.filter(t => t.risk_score).length > 0
            ? Math.round(timeline.filter(t => t.risk_score).reduce((a, b) => a + b.risk_score, 0) / timeline.filter(t => t.risk_score).length)
            : 0
    }

    return (
        <div>
            <div className="page-header">
                <h2>📅 Health Memory</h2>
                <p>Your complete health timeline – all reports, scans, and assessments stored locally</p>
            </div>

            {/* Stats */}
            <div className="grid-4 animate-in" style={{ marginBottom: 24 }}>
                {[
                    { icon: '📄', label: 'Total Reports', value: stats.reports, color: '#06b6d4' },
                    { icon: '📸', label: 'Food Scans', value: stats.scans, color: '#10b981' },
                    { icon: '⚠️', label: 'Alerts', value: stats.alerts, color: '#ef4444' },
                    { icon: '📊', label: 'Avg Risk', value: `${stats.avgRisk}%`, color: '#f59e0b' },
                ].map((s, i) => (
                    <div key={i} className="glass-card stat-card">
                        <div className="stat-icon" style={{ background: `${s.color}18`, fontSize: 18 }}>{s.icon}</div>
                        <div className="stat-value" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="tabs animate-in" style={{ marginBottom: 20, width: 'fit-content' }}>
                {['all', 'report', 'scan', 'alert', 'vitals'].map(f => (
                    <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}
                        style={{ textTransform: 'capitalize' }}>{f === 'all' ? 'All Events' : f + 's'}</button>
                ))}
            </div>

            {/* Timeline */}
            <div className="glass-card animate-in">
                <div className="timeline">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                            <span className="spinner" /> Loading health memory...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                            <Clock size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                            <p>No health events found.</p>
                            <p style={{ fontSize: 13, marginTop: 4 }}>Reports and scans will appear here once processed.</p>
                        </div>
                    ) : (
                        filtered.map((item) => {
                            const Icon = iconMap[item.event_type] || Clock
                            const color = colorMap[item.event_type] || '#06b6d4'
                            const severity = item.event_type === 'alert' ? 'critical' : item.risk_score > 60 ? 'warning' : ''
                            return (
                                <div key={item.id} className={`timeline-item ${severity}`}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div>
                                            <div className="tl-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Icon size={14} color={color} />
                                                {item.title}
                                            </div>
                                            <div className="tl-desc">{item.description}</div>
                                            <div className="tl-date">{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        {item.risk_score != null && (
                                            <div style={{
                                                padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                                background: item.risk_score > 60 ? 'rgba(239,68,68,0.15)' : item.risk_score > 30 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                                                color: item.risk_score > 60 ? '#ef4444' : item.risk_score > 30 ? '#f59e0b' : '#10b981'
                                            }}>
                                                {item.risk_score}%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
