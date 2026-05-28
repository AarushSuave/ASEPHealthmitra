import { useState } from 'react'
import { Activity, Heart, Droplets, AlertTriangle } from 'lucide-react'

export default function RiskPredictor() {
    const [vitals, setVitals] = useState({
        age: 0, gender: 'male', height: 0, weight: 0, bmi: 0,
        blood_pressure_systolic: 0, blood_pressure_diastolic: 0,
        blood_sugar_fasting: 0, cholesterol_total: 0,
        heart_rate: 0, smoking: false,
        family_history_diabetes: false, family_history_heart: false,
        exercise_minutes_weekly: 0
    })
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleChange = (field, value) => {
        setVitals(prev => {
            const next = { ...prev, [field]: value }
            // Auto-calculate BMI if height or weight changes
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

    const handlePredict = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/risk/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vitals)
            })
            const data = await res.json()
            setResult(data)
        } catch {
            // Fallback calculation
            let dRisk = 15, hRisk = 12
            if (vitals.age > 45) { dRisk += 15; hRisk += 12 }
            if (vitals.bmi > 25) { dRisk += 12; hRisk += 10 }
            if (vitals.blood_sugar_fasting > 100) dRisk += 18
            if (vitals.blood_pressure_systolic > 130) hRisk += 15
            if (vitals.cholesterol_total > 200) hRisk += 12
            if (vitals.smoking) { dRisk += 5; hRisk += 15 }
            if (vitals.family_history_diabetes) dRisk += 15
            if (vitals.family_history_heart) hRisk += 12
            dRisk = Math.min(dRisk, 95); hRisk = Math.min(hRisk, 95)

            setResult({
                diabetes_risk: dRisk, diabetes_level: dRisk < 30 ? 'low' : dRisk < 60 ? 'moderate' : 'high',
                heart_risk: hRisk, heart_level: hRisk < 30 ? 'low' : hRisk < 60 ? 'moderate' : 'high',
                recommendations: [
                    '🏃 Exercise at least 150 minutes/week',
                    '🥗 Follow a balanced diet rich in fiber',
                    '💊 Monitor blood pressure regularly',
                    '🩸 Get HbA1c test every 3 months',
                    '🚭 Avoid smoking and excessive alcohol'
                ],
                emergency: { is_emergency: false, alerts: [] }
            })
        }
        setLoading(false)
    }

    const getRiskColor = (score) => score >= 60 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#10b981'
    const circumference = 2 * Math.PI * 65

    return (
        <div>
            <div className="page-header">
                <h2>📊 Future Risk Predictor</h2>
                <p>Enter your vitals to predict diabetes and heart disease risk with AI</p>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
                {/* Input Form */}
                <div className="glass-card animate-in" style={{ width: 340, flexShrink: 0 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>🩺 Enter Your Vitals</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="grid-2" style={{ gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Age</label>
                                <input type="number" className="form-input" value={vitals.age} onChange={e => handleChange('age', +e.target.value)} />
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
                                <input type="number" className="form-input" value={vitals.height} onChange={e => handleChange('height', +e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Weight (kg)</label>
                                <input type="number" className="form-input" value={vitals.weight} onChange={e => handleChange('weight', +e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">BMI (Auto-calculated)</label>
                            <input type="number" step="0.1" className="form-input" value={vitals.bmi} readOnly style={{ background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }} />
                        </div>
                        <div className="grid-2" style={{ gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">BP Systolic</label>
                                <input type="number" className="form-input" value={vitals.blood_pressure_systolic} onChange={e => handleChange('blood_pressure_systolic', +e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">BP Diastolic</label>
                                <input type="number" className="form-input" value={vitals.blood_pressure_diastolic} onChange={e => handleChange('blood_pressure_diastolic', +e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fasting Blood Sugar (mg/dL)</label>
                            <input type="number" className="form-input" value={vitals.blood_sugar_fasting} onChange={e => handleChange('blood_sugar_fasting', +e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Total Cholesterol (mg/dL)</label>
                            <input type="number" className="form-input" value={vitals.cholesterol_total} onChange={e => handleChange('cholesterol_total', +e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Heart Rate (bpm)</label>
                            <input type="number" className="form-input" value={vitals.heart_rate} onChange={e => handleChange('heart_rate', +e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Exercise (min/week)</label>
                            <input type="number" className="form-input" value={vitals.exercise_minutes_weekly} onChange={e => handleChange('exercise_minutes_weekly', +e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { key: 'smoking', label: '🚬 Smoker' },
                                { key: 'family_history_diabetes', label: '👨‍👩‍👧 Family: Diabetes' },
                                { key: 'family_history_heart', label: '❤️ Family: Heart Disease' },
                            ].map(({ key, label }) => (
                                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={vitals[key]} onChange={e => handleChange(key, e.target.checked)}
                                        style={{ accentColor: 'var(--accent-teal)' }} />
                                    {label}
                                </label>
                            ))}
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={handlePredict} disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                            {loading ? 'Predicting...' : '🔮 Predict Risk'}
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div style={{ flex: 1 }}>
                    {result ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="grid-2">
                                {/* Diabetes Risk */}
                                <div className="glass-card animate-in" style={{ textAlign: 'center' }}>
                                    <h4 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Droplets size={16} /> Diabetes Risk
                                    </h4>
                                    <div className="risk-gauge">
                                        <svg width="160" height="160" viewBox="0 0 160 160">
                                            <circle cx="80" cy="80" r="65" className="gauge-bg" />
                                            <circle cx="80" cy="80" r="65" className="gauge-fill"
                                                stroke={getRiskColor(result.diabetes_risk)}
                                                strokeDasharray={circumference}
                                                strokeDashoffset={circumference - (result.diabetes_risk / 100) * circumference} />
                                        </svg>
                                        <div className="gauge-value">
                                            <div className="gauge-number" style={{ color: getRiskColor(result.diabetes_risk) }}>{result.diabetes_risk}%</div>
                                            <div className="gauge-label">{result.diabetes_level}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Heart Risk */}
                                <div className="glass-card animate-in" style={{ textAlign: 'center' }}>
                                    <h4 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Heart size={16} /> Heart Disease Risk
                                    </h4>
                                    <div className="risk-gauge">
                                        <svg width="160" height="160" viewBox="0 0 160 160">
                                            <circle cx="80" cy="80" r="65" className="gauge-bg" />
                                            <circle cx="80" cy="80" r="65" className="gauge-fill"
                                                stroke={getRiskColor(result.heart_risk)}
                                                strokeDasharray={circumference}
                                                strokeDashoffset={circumference - (result.heart_risk / 100) * circumference} />
                                        </svg>
                                        <div className="gauge-value">
                                            <div className="gauge-number" style={{ color: getRiskColor(result.heart_risk) }}>{result.heart_risk}%</div>
                                            <div className="gauge-label">{result.heart_level}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="glass-card animate-in">
                                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>💡 Recommendations</h3>
                                {result.recommendations.map((rec, i) => (
                                    <div key={i} style={{ padding: '10px 14px', background: 'rgba(6,182,212,0.06)', borderRadius: 8, marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                                        {rec}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text-muted)' }}>
                            <Activity size={48} strokeWidth={1} style={{ marginBottom: 16, opacity: 0.3 }} />
                            <p style={{ fontSize: 16, fontWeight: 500 }}>Enter your vitals and click Predict</p>
                            <p style={{ fontSize: 13, marginTop: 4 }}>AI will analyze your health risk factors</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
