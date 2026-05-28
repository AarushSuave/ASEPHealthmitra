import { useState, useEffect } from 'react'
import { UserCircle, Heart, Droplets, Activity, TrendingUp, Shield, Brain } from 'lucide-react'

export default function HealthTwin() {
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchHealthTwin = async () => {
            try {
                const res = await fetch('/api/health_twin/')
                if (res.ok) {
                    const data = await res.json()
                    setProfile(data)
                }
            } catch (error) {
                console.error("Failed to fetch health twin data:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchHealthTwin()
    }, [])

    const trendIcon = (trend) => trend === 'rising' ? '📈' : trend === 'falling' ? '📉' : '➡️'
    const trendColor = (trend, goodDirection) => {
        if (trend === goodDirection) return '#10b981'
        if (trend === 'stable') return '#f59e0b'
        return '#ef4444'
    }

    const circumference = 2 * Math.PI * 65

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
                <Brain size={48} className="animate-pulse" />
                <span style={{ marginLeft: 16, fontSize: 18 }}>Generating AI Health Twin...</span>
            </div>
        )
    }

    if (!profile) return <div>Failed to load profile.</div>

    return (
        <div>
            <div className="page-header">
                <h2>👤 AI Health Twin</h2>
                <p>Your digital health profile with continuous AI monitoring and insights</p>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
                {/* Profile Card */}
                <div style={{ width: 300, flexShrink: 0 }}>
                    <div className="glass-card glow-teal animate-in" style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 36 }}>
                            👤
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 700 }}>{profile.name}</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                            {profile.age > 0 ? `${profile.age} yrs • ` : ''}{profile.gender} • {profile.blood_group}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <span>📏 {profile.height}</span>
                            <span>⚖️ {profile.weight}</span>
                            <span>BMI: {profile.bmi}</span>
                        </div>
                    </div>

                    {/* Overall Score */}
                    <div className="glass-card animate-in" style={{ textAlign: 'center' }}>
                        <h4 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Overall Health Score</h4>
                        <div className="risk-gauge">
                            <svg width="160" height="160" viewBox="0 0 160 160">
                                <circle cx="80" cy="80" r="65" className="gauge-bg" />
                                <circle cx="80" cy="80" r="65" className="gauge-fill"
                                    stroke={profile.overall_health >= 70 ? '#10b981' : '#f59e0b'}
                                    strokeDasharray={circumference}
                                    strokeDashoffset={circumference - (profile.overall_health / 100) * circumference} />
                            </svg>
                            <div className="gauge-value">
                                <div className="gauge-number" style={{ color: profile.overall_health >= 70 ? '#10b981' : '#f59e0b' }}>{profile.overall_health}</div>
                                <div className="gauge-label">out of 100</div>
                            </div>
                        </div>
                    </div>

                    {/* Conditions */}
                    <div className="glass-card animate-in" style={{ marginTop: 16 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>🏷️ Active Conditions</h4>
                        {profile.conditions.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No known conditions.</div>
                        ) : (
                            profile.conditions.map((c, i) => (
                                <div key={i} style={{ padding: '6px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, marginBottom: 6, fontSize: 13, color: '#f59e0b' }}>
                                    ⚠️ {c}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Metrics + Insights */}
                <div style={{ flex: 1 }}>
                    {/* Vital Metrics */}
                    <div className="grid-3 animate-in" style={{ marginBottom: 20 }}>
                        {Object.entries(profile.metrics).map(([key, val]) => {
                            const labels = { blood_sugar: '🩸 Blood Sugar', blood_pressure: '💊 Blood Pressure', cholesterol: '🧈 Cholesterol', hemoglobin: '🔬 Hemoglobin', heart_rate: '💓 Heart Rate', bmi: '⚖️ BMI' }
                            const units = { blood_sugar: 'mg/dL', blood_pressure: 'mmHg', cholesterol: 'mg/dL', hemoglobin: 'g/dL', heart_rate: 'bpm', bmi: '' }
                            const goodDir = { blood_sugar: 'falling', cholesterol: 'falling', bmi: 'falling', blood_pressure: 'falling', heart_rate: 'stable', hemoglobin: 'stable' }

                            // Check if metric has data
                            const hasData = val.history && val.history.length > 0;

                            return (
                                <div key={key} className="glass-card" style={{ padding: 16 }}>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{labels[key]}</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                        <span style={{ fontSize: 24, fontWeight: 700 }}>{hasData ? val.current : '--'}</span>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hasData ? units[key] : ''}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: hasData ? trendColor(val.trend, goodDir[key]) : 'var(--text-muted)' }}>
                                        {hasData ? trendIcon(val.trend) : ''} {hasData ? val.trend : 'No data'}
                                    </div>
                                    {/* Mini sparkline */}
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, marginTop: 12, height: 30 }}>
                                        {!hasData ? (
                                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }}></div>
                                        ) : (
                                            val.history.map((v, i) => {
                                                // Handle numeric values for sparkline
                                                let numericVal = v;
                                                if (key === 'blood_pressure' && typeof v === 'string') {
                                                    numericVal = parseInt(v.split('/')[0]);
                                                }
                                                const max = Math.max(...val.history.map(h => typeof h === 'string' ? parseInt(h.split('/')[0]) : h))
                                                const height = max > 0 ? (numericVal / max) * 30 : 2
                                                return (
                                                    <div key={i} style={{
                                                        flex: 1, height, borderRadius: 2, transition: 'height 0.5s ease',
                                                        background: i === val.history.length - 1 ? 'var(--accent-teal)' : 'rgba(255,255,255,0.1)'
                                                    }} />
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* AI Insights */}
                    <div className="glass-card animate-in">
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Brain size={18} color="var(--accent-purple)" /> AI Insights & Monitoring
                        </h3>
                        {profile.ai_insights.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No insights available yet.</div>
                        ) : (
                            profile.ai_insights.map((insight, i) => {
                                const colors = { warning: '#f59e0b', positive: '#10b981', info: '#06b6d4' }
                                const icons = { warning: '⚠️', positive: '✅', info: 'ℹ️' }
                                return (
                                    <div key={i} style={{
                                        padding: '12px 16px', borderRadius: 10, marginBottom: 8,
                                        background: `${colors[insight.type]}10`, borderLeft: `3px solid ${colors[insight.type]}`,
                                        fontSize: 14, color: 'var(--text-secondary)'
                                    }}>
                                        {icons[insight.type]} {insight.text}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
