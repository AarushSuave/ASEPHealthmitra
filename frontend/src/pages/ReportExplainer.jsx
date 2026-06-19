import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { saveLatestReport } from '../utils/healthSync'
import {
    AlertTriangle, ChevronDown, ChevronUp, Info, ShieldCheck, HeartPulse, List, Trash2, History, FileText
} from 'lucide-react'

export default function ReportExplainer() {
    const { user, token } = useAuth()
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [history, setHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [expandedSections, setExpandedSections] = useState({
        red_flags: true,
        borderline: true,
        normal: false,
        incomplete: true
    })
    const fileRef = useRef()

    const authHeaders = () => {
        const h = {}
        if (token) h.Authorization = `Bearer ${token}`
        return h
    }

    const loadHistory = async () => {
        if (!token) return
        setHistoryLoading(true)
        try {
            const res = await fetch('/api/reports/history', { headers: authHeaders() })
            if (res.ok) setHistory(await res.json())
        } catch (err) {
            console.error('Failed to load report history:', err)
        }
        setHistoryLoading(false)
    }

    useEffect(() => {
        loadHistory()
    }, [token])

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    const handleUpload = async () => {
        if (!file) return
        if (!token) {
            setError('Please log in to upload and save reports.')
            return
        }
        setLoading(true)
        setError(null)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/reports/upload', {
                method: 'POST',
                headers: authHeaders(),
                body: formData,
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || `Server error: ${res.status}`)
            setResult(data)
            if (user?.id) {
                saveLatestReport(user.id, {
                    filename: file.name,
                    report: data.report,
                    risk_score: data.report?.risk_scores?.cardiovascular?.score,
                    risk_level: data.report?.risk_scores?.cardiovascular?.level,
                    explanation_en: data.explanation_en,
                })
                window.dispatchEvent(new Event('hm-health-updated'))
            }
            await loadHistory()
        } catch (err) {
            console.error('Report upload failed:', err)
            setError(err.message || 'Processing failed. Check backend connection.')
        }
        setLoading(false)
    }

    const handleDelete = async (reportId) => {
        if (!window.confirm('Delete this report permanently?')) return
        try {
            const res = await fetch(`/api/reports/${reportId}`, {
                method: 'DELETE',
                headers: authHeaders(),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Delete failed')
            if (result?.id === reportId) setResult(null)
            await loadHistory()
            window.dispatchEvent(new Event('hm-health-updated'))
        } catch (err) {
            setError(err.message)
        }
    }

    const getSeverityColor = (severity) => {
        if (severity >= 2) return '#ef4444'
        if (severity === 1) return '#f59e0b'
        return '#10b981'
    }

    const renderParameterCard = (param, i) => (
        <div key={i} className="parameter-row" style={{ borderLeft: `4px solid ${getSeverityColor(param.severity)}` }}>
            <div className="param-info">
                <span className="param-name">{param.parameter}</span>
                <span className="param-meta">{param.classification_used} Guideline</span>
            </div>
            <div className="param-value">
                <span className="val">{param.value} {param.unit}</span>
                <span className="ref">Reference: {param.guideline_reference}</span>
            </div>
            <div className={`param-status status-${param.status.toLowerCase().replace(/\s+/g, '-')}`}>
                {param.status}
            </div>
        </div>
    )

    const circumference = 2 * Math.PI * 65
    const cvRisk = result?.report?.risk_scores?.cardiovascular

    return (
        <div className="clinical-engine">
            <div className="page-header">
                <h2>Clinical Report Scanner</h2>
                <p>Tesseract OCR analysis using ADA, AHA, and WHO clinical reference ranges.</p>
            </div>

            <div className="grid-2" style={{ marginBottom: 24 }}>
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
                                <p>PDF or image – processed with Tesseract OCR</p>
                            </>
                        )}
                    </div>

                    <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 16 }} onClick={handleUpload} disabled={!file || loading}>
                        {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Analyzing...</> : <><ShieldCheck size={18} /> Analyze Report</>}
                    </button>

                    {error && (
                        <div className="error-banner" style={{ marginTop: 12 }}>
                            <AlertTriangle size={14} /> {error}
                        </div>
                    )}

                    <div style={{ marginTop: 20 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <History size={14} /> Uploaded Reports
                        </h4>
                        {historyLoading ? (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</p>
                        ) : history.length === 0 ? (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No reports yet.</p>
                        ) : (
                            history.map((r) => (
                                <div key={r.id} className="report-history-item">
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{r.filename}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                                            {r.risk_level ? ` · ${r.risk_level}` : ''}
                                        </div>
                                    </div>
                                    <button className="btn btn-outline btn-sm" onClick={() => handleDelete(r.id)} title="Delete">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="glass-card animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {result && cvRisk ? (
                        cvRisk.status === 'Calculated' && cvRisk.score != null ? (
                            <>
                                <div className="risk-gauge">
                                    <svg width="160" height="160" viewBox="0 0 160 160">
                                        <circle cx="80" cy="80" r="65" className="gauge-bg" />
                                        <circle
                                            cx="80" cy="80" r="65"
                                            className="gauge-fill"
                                            stroke={getSeverityColor(cvRisk.score >= 60 ? 2 : cvRisk.score >= 30 ? 1 : 0)}
                                            strokeDasharray={circumference}
                                            strokeDashoffset={circumference - (cvRisk.score / 100) * circumference}
                                        />
                                    </svg>
                                    <div className="gauge-value">
                                        <div className="gauge-number" style={{ color: getSeverityColor(cvRisk.score >= 60 ? 2 : cvRisk.score >= 30 ? 1 : 0) }}>
                                            {cvRisk.score}%
                                        </div>
                                        <div className="gauge-label">Clinical Risk</div>
                                    </div>
                                </div>
                                <div className="risk-badge" style={{ background: `${getSeverityColor(cvRisk.score >= 60 ? 2 : 1)}20`, color: getSeverityColor(cvRisk.score >= 60 ? 2 : 1) }}>
                                    {cvRisk.level} Risk ({cvRisk.message})
                                </div>
                                {cvRisk.measured?.length > 0 && (
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                                        Markers used: {cvRisk.measured.join(', ')}
                                    </p>
                                )}
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#f59e0b' }}>
                                <AlertTriangle size={48} strokeWidth={1} style={{ marginBottom: 12 }} />
                                <h4>Insufficient Data</h4>
                                <p style={{ fontSize: 13, padding: '0 20px' }}>{cvRisk.message || 'Could not calculate risk score.'}</p>
                            </div>
                        )
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            <HeartPulse size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
                            <p style={{ fontSize: 14 }}>Waiting for report upload...</p>
                        </div>
                    )}
                </div>
            </div>

            {result && (
                <div className="results-container animate-in">
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

                    {result.report.incomplete.length > 0 && (
                        <div className="category-section incomplete">
                            <div className="category-header" onClick={() => toggleSection('incomplete')}>
                                <h4>⚠ INCOMPLETE DATA ({result.report.incomplete.length})</h4>
                                {expandedSections.incomplete ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                            {expandedSections.incomplete && (
                                <div className="category-content">
                                    {result.report.incomplete.map((p, i) => (
                                        <div key={i} className="parameter-row" style={{ borderLeft: '4px solid #94a3b8', background: 'rgba(148,163,184,0.08)' }}>
                                            <div className="param-info">
                                                <span className="param-name">{p.parameter}</span>
                                                <span className="param-meta">Parsing incomplete</span>
                                            </div>
                                            <div className="param-value" style={{ color: '#64748b' }}>Value Missing</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

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
                                    <p style={{ padding: 12, fontSize: 13, color: 'var(--text-muted)' }}>No normal parameters identified.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid-2" style={{ marginTop: 16 }}>
                        <div className="glass-card">
                            <h4 className="section-title"><List size={16} /> Safe Lifestyle Remedies</h4>
                            <ul className="remedies-list">
                                {result.report.remedies.map((remedy, i) => (
                                    <li key={i}>{remedy}</li>
                                ))}
                            </ul>
                            <p className="disclaimer-note">
                                <Info size={12} /> Lifestyle suggestions only. Consult a doctor for diagnosis.
                            </p>
                        </div>

                        <div className="glass-card">
                            <h4 className="section-title"><FileText size={16} /> Report Summary</h4>
                            <div className="explanation-text" style={{ fontSize: 14, lineHeight: 1.6 }}>
                                {result.explanation_en}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
