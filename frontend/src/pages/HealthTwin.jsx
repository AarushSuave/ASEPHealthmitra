import { useState, useEffect, useCallback } from 'react'
import { UserCircle, Brain, RefreshCw, FileText, Heart, Droplets, Link2 } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { getHealthSync } from '../utils/healthSync'

export default function HealthTwin() {
    const { token, user } = useAuth()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchHealthTwin = useCallback(async () => {
        if (!token) {
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const res = await fetch('/api/health_twin/', {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                setProfile(await res.json())
            } else if (user?.id) {
                const sync = getHealthSync(user.id)
                if (sync.risk || sync.latestReport) {
                    setProfile({
                        name: user.name,
                        age: user.age || 0,
                        gender: user.gender || 'Unknown',
                        blood_group: user.blood_group || '-',
                        height: user.height_cm ? `${user.height_cm} cm` : 'Not set',
                        weight: user.weight_kg ? `${user.weight_kg} kg` : 'Not set',
                        bmi: sync.vitals?.bmi || 0,
                        conditions: [],
                        metrics: {},
                        overall_health: sync.risk?.combined_risk || 50,
                        ai_insights: [{ type: 'info', text: 'Showing cached data — server unavailable.' }],
                        risk_sync: sync.risk,
                        latest_report: sync.latestReport,
                        report_count: 0,
                    })
                } else {
                    setProfile(null)
                }
            }
        } catch (error) {
            console.error('Failed to fetch health twin data:', error)
        } finally {
            setLoading(false)
        }
    }, [token, user])

    useEffect(() => {
        fetchHealthTwin()
    }, [fetchHealthTwin])

    useEffect(() => {
        const onUpdate = () => fetchHealthTwin()
        window.addEventListener('hm-health-updated', onUpdate)
        return () => window.removeEventListener('hm-health-updated', onUpdate)
    }, [fetchHealthTwin])

    const trendIcon = (trend) => (trend === 'rising' ? '📈' : trend === 'falling' ? '📉' : '➡️')
    const trendColor = (trend, goodDirection) => {
        if (trend === goodDirection) return '#10b981'
        if (trend === 'stable') return '#f59e0b'
        return '#ef4444'
    }

    const circumference = 2 * Math.PI * 65
    const riskColor = (s) => (s >= 60 ? '#ef4444' : s >= 30 ? '#f59e0b' : '#10b981')

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
                <Brain size={48} className="animate-pulse" />
                <span style={{ marginLeft: 16, fontSize: 18 }}>Loading Health Twin...</span>
            </div>
        )
    }

    if (!profile) return <div className="glass-card">Failed to load profile. Try refreshing or complete Risk Predictor / Report Scanner first.</div>

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2>👤 Health Twin / स्वास्थ्य ट्विन</h2>
                    <p>Synced from your latest report scan and Risk Predictor vitals (रिपोर्ट और जोखिम डेटा से अपडेट).</p>
                </div>
                <button className="btn btn-outline" onClick={fetchHealthTwin}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                {profile.latest_report && (
                    <div className="glass-card" style={{ borderLeft: '3px solid #06b6d4' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <FileText size={18} color="#06b6d4" />
                            <span style={{ fontWeight: 700 }}>Latest Report Scan</span>
                            <Link2 size={14} style={{ opacity: 0.5 }} />
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{profile.latest_report.filename}</div>
                        <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: riskColor(profile.latest_report.risk_score || 0) }}>
                            {profile.latest_report.risk_score != null ? `${profile.latest_report.risk_score}%` : 'N/A'} {profile.latest_report.risk_level || ''}
                        </div>
                        {profile.latest_report.created_at && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                {new Date(profile.latest_report.created_at).toLocaleString('en-IN')}
                            </div>
                        )}
                    </div>
                )}

                {profile.risk_sync && (
                    <div className="glass-card" style={{ borderLeft: '3px solid #f59e0b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Heart size={18} color="#f59e0b" />
                            <span style={{ fontWeight: 700 }}>Risk Predictor Sync</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                            <div>
                                <Droplets size={14} style={{ opacity: 0.7 }} />
                                <div style={{ fontSize: 20, fontWeight: 800, color: riskColor(profile.risk_sync.diabetes_risk) }}>{profile.risk_sync.diabetes_risk}%</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Diabetes</div>
                            </div>
                            <div>
                                <Heart size={14} style={{ opacity: 0.7 }} />
                                <div style={{ fontSize: 20, fontWeight: 800, color: riskColor(profile.risk_sync.heart_risk) }}>{profile.risk_sync.heart_risk}%</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Heart</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: riskColor(profile.risk_sync.combined_risk) }}>{profile.risk_sync.combined_risk}%</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Combined</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="glass-card">
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Reports on file</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#06b6d4' }}>{profile.report_count ?? 0}</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ width: 300, flexShrink: 0 }}>
                    <div className="glass-card glow-teal animate-in" style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 36 }}>
                            <UserCircle size={40} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 700 }}>{profile.name}</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                            {profile.age > 0 ? `${profile.age} yrs • ` : ''}{profile.gender} • {profile.blood_group}
                        </p>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: 8,
                            marginTop: 16,
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            textAlign: 'center',
                        }}>
                            <span title="Height">📏<br />{profile.height}</span>
                            <span title="Weight">⚖️<br />{profile.weight}</span>
                            <span title="BMI">BMI<br />{profile.bmi || '—'}</span>
                        </div>
                    </div>

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

                <div style={{ flex: 1, minWidth: 280 }}>
                    <div className="grid-3 animate-in" style={{ marginBottom: 20 }}>
                        {Object.entries(profile.metrics).map(([key, val]) => {
                            const labels = {
                                blood_sugar: '🩸 Blood Sugar',
                                blood_pressure: '💊 Blood Pressure',
                                cholesterol: '🧈 Cholesterol',
                                hemoglobin: '🔬 Hemoglobin',
                                heart_rate: '💓 Heart Rate',
                                bmi: '⚖️ BMI',
                            }
                            const units = { blood_sugar: 'mg/dL', blood_pressure: 'mmHg', cholesterol: 'mg/dL', hemoglobin: 'g/dL', heart_rate: 'bpm', bmi: '' }
                            const hasData = val.history && val.history.length > 0
                            const atRisk = val.risk_status === 'at_risk'
                            const statusLabel = !hasData ? 'No data yet' : atRisk ? 'At Risk' : 'Stable'
                            const statusColor = !hasData ? 'var(--text-muted)' : atRisk ? '#ef4444' : '#10b981'

                            return (
                                <div key={key} className="glass-card" style={{ padding: 16, borderTop: atRisk ? '3px solid #ef4444' : undefined }}>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{labels[key]}</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                        <span style={{ fontSize: 24, fontWeight: 700 }}>{hasData ? val.current : '--'}</span>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hasData ? units[key] : ''}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, fontWeight: atRisk ? 700 : 500, color: statusColor }}>
                                        {hasData && atRisk ? '⚠️' : hasData ? '✓' : ''} {statusLabel}
                                        {hasData && val.trend && val.trend !== 'stable' && (
                                            <span style={{ marginLeft: 4, opacity: 0.7, color: trendColor(val.trend, 'falling') }}>
                                                {trendIcon(val.trend)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {profile.risk_sync?.recommendations?.length > 0 && (
                        <div className="glass-card animate-in" style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📋 From Risk Predictor</h3>
                            {profile.risk_sync.recommendations.slice(0, 4).map((rec, i) => (
                                <div key={i} style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: i < 3 ? '1px solid var(--border-glass)' : 'none' }}>
                                    {rec}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="glass-card animate-in">
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Brain size={18} color="var(--accent-purple)" /> Insights / सुझाव
                        </h3>
                        {profile.ai_insights.map((insight, i) => {
                            const colors = { warning: '#f59e0b', positive: '#10b981', info: '#06b6d4' }
                            const icons = { warning: '⚠️', positive: '✅', info: 'ℹ️' }
                            return (
                                <div key={i} style={{
                                    padding: '12px 16px', borderRadius: 10, marginBottom: 8,
                                    background: `${colors[insight.type]}10`, borderLeft: `3px solid ${colors[insight.type]}`,
                                    fontSize: 14, color: 'var(--text-secondary)',
                                }}>
                                    {icons[insight.type]} {insight.text}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
