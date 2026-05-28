import { useState, useRef } from 'react'
import {
    Upload, FileText, AlertTriangle, CheckCircle, Languages, Activity,
    ChevronDown, ChevronUp, Info, ShieldCheck, HeartPulse, List
} from 'lucide-react'

export default function ReportExplainer() {
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [language, setLanguage] = useState('en')
    const [expandedSections, setExpandedSections] = useState({
        red_flags: true,
        borderline: true,
        normal: false,
        incomplete: true
    })
    const fileRef = useRef()

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    const handleUpload = async () => {
        if (!file) return
        setLoading(true)
        setError(null)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('language', language)
        formData.append('patient_id', 1) // Default for demo

        try {
            const res = await fetch('/api/reports/upload', { method: 'POST', body: formData })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.detail || `Server error: ${res.status}`)
            }
            setResult(data)
        } catch (err) {
            console.error('Report upload failed:', err)
            setError(err.message || 'Processing failed. Please check the backend connection.')
        }
        setLoading(false)
    }

    const getSeverityColor = (severity) => {
        if (severity >= 2) return '#ef4444' // Red Flag
        if (severity === 1) return '#f59e0b' // Borderline
        return '#10b981' // Normal
    }

    const renderParameterCard = (param, i) => (
        <div key={i} className="parameter-row" style={{ borderLeft: `4px solid ${getSeverityColor(param.severity)}` }}>
            <div className="param-info">
                <span className="param-name">{param.parameter}</span>
                <span className="param-meta">{param.classification_used} Guideline</span>
            </div>
            <div className="param-value">
                <span className="val">{param.value} {param.unit}</span>
                <span className="ref">Target: {param.guideline_reference}</span>
            </div>
            <div className={`param-status status-${param.status.toLowerCase()}`}>
                {param.status}
            </div>
        </div>
    )

    const circumference = 2 * Math.PI * 65

    return (
        <div className="clinical-engine">
            <div className="page-header">
                <h2>🩺 Clinical Report Intelligence Engine</h2>
                <p>Deterministic analysis following ADA, AHA, and WHO international medical guidelines.</p>
            </div>

            <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Upload Zone */}
                <div className="glass-card animate-in">
                    <div
                        className={`upload-zone ${file ? 'has-file' : ''}`}
                        onClick={() => fileRef.current?.click()}
                    >
                        <input ref={fileRef} type="file" hidden accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files[0])} />
                        {file ? (
                            <>
                                <div className="upload-icon">📄</div>
                                <h3>{file.name}</h3>
                                <p>{(file.size / 1024).toFixed(1)} KB – Click to change</p>
                            </>
                        ) : (
                            <>
                                <div className="upload-icon">🧬</div>
                                <h3>Upload Clinical Lab Report</h3>
                                <p>Supports PDF/Images – Deterministic Processing Only</p>
                            </>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                        <div className="tabs" style={{ flex: 1, marginBottom: 0 }}>
                            <button className={`tab ${language === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')}>English</button>
                            <button className={`tab ${language === 'hi' ? 'active' : ''}`} onClick={() => setLanguage('hi')}>हिंदी</button>
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={handleUpload} disabled={!file || loading}>
                            {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Validating...</> : <><ShieldCheck size={18} /> Analyze Report</>}
                        </button>
                    </div>

                    {error && (
                        <div className="error-banner" style={{ marginTop: 12 }}>
                            <AlertTriangle size={14} /> {error}
                        </div>
                    )}
                </div>

                {/* Risk Gauge */}
                <div className="glass-card animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {result ? (
                        <>
                            {result.report.risk_scores.cardiovascular.status === "Calculated" ? (
                                <>
                                    <div className="risk-gauge">
                                        <svg width="160" height="160" viewBox="0 0 160 160">
                                            <circle cx="80" cy="80" r="65" className="gauge-bg" />
                                            <circle
                                                cx="80" cy="80" r="65"
                                                className="gauge-fill"
                                                stroke={getSeverityColor(result.report.risk_scores.cardiovascular.score >= 60 ? 2 : 1)}
                                                strokeDasharray={circumference}
                                                strokeDashoffset={circumference - (result.report.risk_scores.cardiovascular.score / 100) * circumference}
                                            />
                                        </svg>
                                        <div className="gauge-value">
                                            <div className="gauge-number" style={{ color: getSeverityColor(result.report.risk_scores.cardiovascular.score >= 60 ? 2 : 1) }}>
                                                {result.report.risk_scores.cardiovascular.score}%
                                            </div>
                                            <div className="gauge-label">Clinical Risk</div>
                                        </div>
                                    </div>
                                    <div className="risk-badge" style={{ background: `${getSeverityColor(result.report.risk_scores.cardiovascular.score >= 60 ? 2 : 1)}20`, color: getSeverityColor(result.report.risk_scores.cardiovascular.score >= 60 ? 2 : 1) }}>
                                        {result.report.risk_scores.cardiovascular.level} Cardiovascular Risk
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#f59e0b' }}>
                                    <AlertTriangle size={48} strokeWidth={1} style={{ marginBottom: 12 }} />
                                    <h4>Insufficient Data</h4>
                                    <p style={{ fontSize: 13, padding: '0 20px' }}>Risk score cannot be calculated because: {result.report.risk_scores.cardiovascular.missing.join(', ')}</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            <HeartPulse size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
                            <p style={{ fontSize: 14 }}>Waiting for clinical data upload...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Structured Results */}
            {result && (
                <div className="results-container animate-in">
                    {/* Red Flags */}
                    {result.report.red_flags.length > 0 && (
                        <div className="category-section red-flags">
                            <div className="category-header" onClick={() => toggleSection('red_flags')}>
                                <h4>🔴 RED FLAG MARKERS ({result.report.red_flags.length})</h4>
                                {expandedSections.red_flags ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                            {expandedSections.red_flags && (
                                <div className="category-content">
                                    {result.report.red_flags.map((p, i) => renderParameterCard(p, i))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Borderline */}
                    {result.report.borderline.length > 0 && (
                        <div className="category-section borderline">
                            <div className="category-header" onClick={() => toggleSection('borderline')}>
                                <h4>🟡 BORDERLINE VALUES ({result.report.borderline.length})</h4>
                                {expandedSections.borderline ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                            {expandedSections.borderline && (
                                <div className="category-content">
                                    {result.report.borderline.map((p, i) => renderParameterCard(p, i))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Incomplete */}
                    {result.report.incomplete.length > 0 && (
                        <div className="category-section incomplete">
                            <div className="category-header" onClick={() => toggleSection('incomplete')}>
                                <h4>⚠ INCOMPLETE DATA ({result.report.incomplete.length})</h4>
                                {expandedSections.incomplete ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                            {expandedSections.incomplete && (
                                <div className="category-content">
                                    {result.report.incomplete.map((p, i) => (
                                        <div key={i} className="parameter-row" style={{ borderLeft: `4px solid #94a3b8`, background: '#f8fafc' }}>
                                            <div className="param-info">
                                                <span className="param-name">{p.parameter}</span>
                                                <span className="param-meta">Parsing incomplete for this marker</span>
                                            </div>
                                            <div className="param-value" style={{ color: '#64748b' }}>
                                                Value Missing
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Normal */}
                    <div className="category-section normal">
                        <div className="category-header" onClick={() => toggleSection('normal')}>
                            <h4>🟢 NORMAL PARAMETERS ({result.report.normal.length})</h4>
                            {expandedSections.normal ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                        {expandedSections.normal && (
                            <div className="category-content">
                                {result.report.normal.length > 0 ? (
                                    result.report.normal.map((p, i) => renderParameterCard(p, i))
                                ) : (
                                    <p style={{ padding: 12, fontSize: 13, color: 'var(--text-muted)' }}>No normal parameters identified or report is all abnormal.</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Remedies & Explanation */}
                    <div className="grid-2" style={{ marginTop: 16 }}>
                        {/* Safe Lifestyle Remedies */}
                        <div className="glass-card">
                            <h4 className="section-title"><List size={16} /> Safe Lifestyle Remedies</h4>
                            <ul className="remedies-list">
                                {result.report.remedies.map((remedy, i) => (
                                    <li key={i}>{remedy}</li>
                                ))}
                            </ul>
                            <p className="disclaimer-note">
                                <Info size={12} /> These are lifestyle-based suggestions only. For diagnosis, consult a doctor.
                            </p>
                        </div>

                        {/* AI Explanation */}
                        <div className="glass-card">
                            <h4 className="section-title"><Languages size={16} /> {language === 'en' ? 'Clinical Explanation' : 'नैदानिक विवरण'}</h4>
                            <div className="explanation-text" style={{ fontSize: 14, lineHeight: 1.6 }}>
                                {language === 'en' ? result.explanation_en : result.explanation_hi}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
