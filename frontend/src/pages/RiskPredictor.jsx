import { useState, useEffect } from 'react'
import { Activity, Heart, Droplets, AlertTriangle, Link2, TrendingUp, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { getHealthSync, saveVitalsAndRisk } from '../utils/healthSync'

const defaultVitals = {
    age: 0, gender: 'male', height: 0, weight: 0, bmi: 0,
    blood_pressure_systolic: 0, blood_pressure_diastolic: 0,
    blood_sugar_fasting: 0, cholesterol_total: 0,
    heart_rate: 0, smoking: false,
    family_history_diabetes: false, family_history_heart: false,
    exercise_minutes_weekly: 0,
}

export default function RiskPredictor() {
    const { token, user } = useAuth()
    const navigate = useNavigate()
    const [vitals, setVitals] = useState(defaultVitals)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [synced, setSynced] = useState(false)

    useEffect(() => {
        if (!user?.id) {
            setVitals(defaultVitals)
            setResult(null)
            return
        }
        const sync = getHealthSync(user.id)
        const genderNorm = (user.gender || 'male').toLowerCase()
        let bmi = sync.vitals?.bmi || 0
        const height = sync.vitals?.height || user.height_cm || 0
        const weight = sync.vitals?.weight || user.weight_kg || 0
        if (height > 0 && weight > 0) {
            bmi = parseFloat((weight / ((height / 100) ** 2)).toFixed(1))
        }
        setVitals(prev => ({
            ...prev,
            ...sync.vitals,
            age: sync.vitals?.age || user.age || 0,
            gender: genderNorm,
            height,
            weight,
            bmi,
        }))
        if (sync.risk) {
            setResult({
                diabetes_risk: sync.risk.diabetes_risk,
                diabetes_level: sync.risk.diabetes_level,
                heart_risk: sync.risk.heart_risk,
                heart_level: sync.risk.heart_level,
                combined_risk: sync.risk.combined_risk,
                recommendations: sync.risk.recommendations || [],
                emergency: { is_emergency: false, alerts: [] },
            })
        }
    }, [user?.id, user?.age, user?.gender, user?.height_cm, user?.weight_kg, user?.blood_group])

    const handleChange = (field, value) => {
        setVitals(prev => {
            const next = { ...prev, [field]: value }
            if (field === 'height' || field === 'weight') {
                const h = field === 'height' ? value : prev.height
                const w = field === 'weight' ? value : prev.weight
                if (h > 0 && w > 0) {
                    const heightInMeters = h / 100
                    next.bmi = parseFloat((w / (heightInMeters * heightInMeters)).toFixed(1))
                }
            }
            return next
        })
    }

    const runFallback = () => {
        let dRisk = 15, hRisk = 12
        if (vitals.age > 45) { dRisk += 15; hRisk += 12 }
        if (vitals.bmi > 25) { dRisk += 12; hRisk += 10 }
        if (vitals.blood_sugar_fasting > 100) dRisk += 18
        if (vitals.blood_pressure_systolic > 130) hRisk += 15
        if (vitals.cholesterol_total > 200) hRisk += 12
        if (vitals.smoking) { dRisk += 5; hRisk += 15 }
        if (vitals.family_history_diabetes) dRisk += 15
        if (vitals.family_history_heart) hRisk += 12
        dRisk = Math.min(dRisk, 95)
        hRisk = Math.min(hRisk, 95)
        return {
            diabetes_risk: dRisk,
            diabetes_level: dRisk < 30 ? 'low' : dRisk < 60 ? 'moderate' : 'high',
            heart_risk: hRisk,
            heart_level: hRisk < 30 ? 'low' : hRisk < 60 ? 'moderate' : 'high',
            combined_risk: Math.round((dRisk + hRisk) / 2),
            recommendations: [
                '🏃 Exercise at least 150 minutes/week',
                '🥗 Follow a balanced diet rich in fiber',
                '💊 Monitor blood pressure regularly',
                '🩸 Get HbA1c test every 3 months',
                '🚭 Avoid smoking and excessive alcohol',
            ],
            emergency: { is_emergency: false, alerts: [] },
        }
    }

    const handlePredict = async () => {
        setLoading(true)
        setSynced(false)
        try {
            const headers = { 'Content-Type': 'application/json' }
            if (token) headers.Authorization = `Bearer ${token}`

            const res = await fetch('/api/risk/predict', {
                method: 'POST',
                headers,
                body: JSON.stringify(vitals),
            })
            const data = res.ok ? await res.json() : runFallback()
            if (!data.combined_risk) {
                data.combined_risk = Math.round((data.diabetes_risk + data.heart_risk) / 2)
            }
            setResult(data)
            if (user?.id) saveVitalsAndRisk(user.id, vitals, data)
            setSynced(true)
        } catch {
            const data = runFallback()
            setResult(data)
            if (user?.id) saveVitalsAndRisk(user.id, vitals, data)
            setSynced(true)
        }
        setLoading(false)
    }

    const getRiskColor = (score) => score >= 60 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#10b981'
    const circumference = 2 * Math.PI * 65

    const bmiCategory = (bmi) => {
        if (!bmi || bmi <= 0) return ''
        if (bmi < 18.5) return 'Underweight (<18.5)'
        if (bmi <= 24.9) return 'Normal (18.5–24.9)'
        if (bmi < 30) return 'Overweight (25–29.9)'
        return 'Obese (≥30)'
    }

    const lifestyleScore = () => {
        let s = 100
        if (vitals.smoking) s -= 20
        if (vitals.exercise_minutes_weekly < 90) s -= 15
        if (vitals.bmi > 0 && vitals.bmi < 18.5) s -= 8
        if (vitals.bmi > 25) s -= 10
        if (vitals.bmi > 30) s -= 10
        return Math.max(s, 20)
    }

    return (
        <div>
            <div className="page-header">
                <h2>📊 Future Risk Predictor / भविष्य जोखिम पूर्वानुमान</h2>
                <p>Enter vitals to predict diabetes and heart risk. Results sync to Health Twin automatically (स्वास्थ्य ट्विन में सहेजा जाता है).</p>
            </div>

            {synced && (
                <div className="glass-card animate-in" style={{ marginBottom: 16, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontSize: 14 }}>
                        <Link2 size={16} /> Synced to Health Twin / स्वास्थ्य ट्विन अपडेट
                    </span>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/twin')}>View Health Twin →</button>
                </div>
            )}

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div className="glass-card animate-in" style={{ width: 340, flexShrink: 0 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>🩺 Enter Your Vitals</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="grid-2" style={{ gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Age / उम्र</label>
                                <input type="number" className="form-input" value={vitals.age || ''} onChange={e => handleChange('age', +e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gender</label>
                                <select className="form-select" value={vitals.gender} onChange={e => handleChange('gender', e.target.value)}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid-2" style={{ gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Height (cm)</label>
                                <input type="number" className="form-input" value={vitals.height || ''} onChange={e => handleChange('height', +e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Weight (kg)</label>
                                <input type="number" className="form-input" value={vitals.weight || ''} onChange={e => handleChange('weight', +e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">BMI (auto) {vitals.bmi > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>– {bmiCategory(vitals.bmi)}</span>}</label>
                            <input type="number" step="0.1" className="form-input" value={vitals.bmi || ''} readOnly style={{ background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }} />
                        </div>
                        <div className="grid-2" style={{ gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">BP Systolic</label>
                                <input type="number" className="form-input" value={vitals.blood_pressure_systolic || ''} onChange={e => handleChange('blood_pressure_systolic', +e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">BP Diastolic</label>
                                <input type="number" className="form-input" value={vitals.blood_pressure_diastolic || ''} onChange={e => handleChange('blood_pressure_diastolic', +e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fasting Blood Sugar</label>
                            <input type="number" className="form-input" value={vitals.blood_sugar_fasting || ''} onChange={e => handleChange('blood_sugar_fasting', +e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cholesterol</label>
                            <input type="number" className="form-input" value={vitals.cholesterol_total || ''} onChange={e => handleChange('cholesterol_total', +e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Heart Rate</label>
                            <input type="number" className="form-input" value={vitals.heart_rate || ''} onChange={e => handleChange('heart_rate', +e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Exercise (min/week)</label>
                            <input type="number" className="form-input" value={vitals.exercise_minutes_weekly || ''} onChange={e => handleChange('exercise_minutes_weekly', +e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { key: 'smoking', label: '🚬 Smoker' },
                                { key: 'family_history_diabetes', label: '👨‍👩‍👧 Family: Diabetes' },
                                { key: 'family_history_heart', label: '❤️ Family: Heart Disease' },
                            ].map(({ key, label }) => (
                                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={vitals[key]} onChange={e => handleChange(key, e.target.checked)} style={{ accentColor: 'var(--accent-teal)' }} />
                                    {label}
                                </label>
                            ))}
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={handlePredict} disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                            {loading ? 'Predicting...' : '🔮 Predict Risk / जोखिम जांच'}
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, minWidth: 280 }}>
                    {result ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="glass-card animate-in" style={{ textAlign: 'center' }}>
                                <h4 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>Combined Risk / संयुक्त जोखिम</h4>
                                <div className="risk-gauge" style={{ margin: '0 auto' }}>
                                    <svg width="140" height="140" viewBox="0 0 160 160">
                                        <circle cx="80" cy="80" r="65" className="gauge-bg" />
                                        <circle cx="80" cy="80" r="65" className="gauge-fill"
                                            stroke={getRiskColor(result.combined_risk)}
                                            strokeDasharray={circumference}
                                            strokeDashoffset={circumference - (result.combined_risk / 100) * circumference} />
                                    </svg>
                                    <div className="gauge-value">
                                        <div className="gauge-number" style={{ color: getRiskColor(result.combined_risk) }}>{result.combined_risk}%</div>
                                        <div className="gauge-label">overall</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid-2">
                                <div className="glass-card animate-in" style={{ textAlign: 'center' }}>
                                    <h4 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Droplets size={16} /> Diabetes
                                    </h4>
                                    <div style={{ fontSize: 32, fontWeight: 800, color: getRiskColor(result.diabetes_risk) }}>{result.diabetes_risk}%</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{result.diabetes_level}</div>
                                </div>
                                <div className="glass-card animate-in" style={{ textAlign: 'center' }}>
                                    <h4 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Heart size={16} /> Heart
                                    </h4>
                                    <div style={{ fontSize: 32, fontWeight: 800, color: getRiskColor(result.heart_risk) }}>{result.heart_risk}%</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{result.heart_level}</div>
                                </div>
                            </div>

                            <div className="grid-2">
                                <div className="glass-card" style={{ padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <TrendingUp size={16} color="#8b5cf6" />
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>Lifestyle Score</span>
                                    </div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: lifestyleScore() >= 70 ? '#10b981' : '#f59e0b' }}>{lifestyleScore()}/100</div>
                                </div>
                                <div className="glass-card" style={{ padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <Shield size={16} color="#06b6d4" />
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>Target Ranges</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                        BMI 18.5–24.9 · BP &lt; 120/80 · Sugar &lt; 100 · Chol &lt; 200
                                        {result.vitals_provided != null && (
                                            <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>
                                                Based on {result.vitals_provided} vital(s) entered
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {result.emergency?.is_emergency && (
                                <div className="glass-card glow-red" style={{ padding: 16, borderLeft: '3px solid #ef4444' }}>
                                    <AlertTriangle size={18} color="#ef4444" style={{ marginBottom: 8 }} />
                                    {result.emergency.alerts?.map((a, i) => <div key={i} style={{ fontSize: 14 }}>{a}</div>)}
                                </div>
                            )}

                            <div className="glass-card animate-in">
                                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>💡 Action Plan / कार्य योजना</h3>
                                {result.recommendations.map((rec, i) => (
                                    <div key={i} style={{ padding: '10px 14px', background: 'rgba(6,182,212,0.06)', borderRadius: 8, marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                                        {rec}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: 'var(--text-muted)' }}>
                            <Activity size={48} strokeWidth={1} style={{ marginBottom: 16, opacity: 0.3 }} />
                            <p style={{ fontSize: 16, fontWeight: 500 }}>Enter vitals and click Predict</p>
                            <p style={{ fontSize: 13, marginTop: 4 }}>Results sync to Health Twin automatically</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
