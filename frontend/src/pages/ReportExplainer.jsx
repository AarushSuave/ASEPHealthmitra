import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import { saveLatestReport } from '../utils/healthSync'
import {
    Upload, FileText, AlertTriangle, CheckCircle, Languages, Activity,
    ChevronDown, ChevronUp, Info, ShieldCheck, HeartPulse, List, Trash2, History
} from 'lucide-react'

export default function ReportExplainer() {
    const { user, token } = useAuth()
    const { lang, t } = useLanguage()
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
            setError(t('Please log in to upload and save reports.', 'रिपोर्ट अपलोड करने के लिए लॉग इन करें।'))
            return
        }
        setLoading(true)
        setError(null)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('language', lang)

        try {
            const res = await fetch('/api/reports/upload', {
                method: 'POST',
                headers: authHeaders(),
                body: formData,
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.detail || `Server error: ${res.status}`)
            }
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
            setError(err.message || t('Processing failed. Check backend connection.', 'प्रसंस्करण विफल।'))
        }
        setLoading(false)
    }

    const handleDelete = async (reportId) => {
        if (!window.confirm(t('Delete this report permanently?', 'इस रिपोर्ट को स्थायी रूप से हटाएं?'))) return
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
                <span className="ref">Target: {param.guideline_reference}</span>
            </div>
            <div className={`param-status status-${param.status.toLowerCase()}`}>
                {param.status}
            </div>
        </div>
    )

    const circumference = 2 * Math.PI * 65
    const cvRisk = result?.report?.risk_scores?.cardiovascular

    return (
        <div className="clinical-engine">
            <div className="page-header">
                <h2>{t('Clinical Report Intelligence Engine', 'नैदानिक रिपोर्ट इंटेलिजेंस')}</h2>
                <p>{t(
                    'Real Tesseract OCR analysis following ADA, AHA, and WHO medical guidelines.',
                    'ADA, AHA और WHO दिशानिर्देशों के अनुसार Tesseract OCR विश्लेषण।'
                )}</p>
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
                                <p>{(file.size / 1024).toFixed(1)} KB – {t('Click to change', 'बदलने के लिए क्लिक करें')}</p>
                            </>
                        ) : (
                            <>
                                <div className="upload-icon">🧬</div>
                                <h3>{t('Upload Clinical Lab Report', 'चिकित्सा लैब रिपोर्ट अपलोड करें')}</h3>
                                <p>{t('PDF/Images – Tesseract OCR Processing', 'PDF/छवियाँ – Tesseract OCR')}</p>
                            </>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                        <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleUpload} disabled={!file || loading}>
                            {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> {t('Analyzing...', 'विश्लेषण...')}</> : <><ShieldCheck size={18} /> {t('Analyze Report', 'रिपोर्ट विश्लेषण')}</>}
                        </button>
                    </div>

                    {error && (
                        <div className="error-banner" style={{ marginTop: 12 }}>
                            <AlertTriangle size={14} /> {error}
                        </div>
                    )}

                    <div style={{ marginTop: 20 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <History size={14} /> {t('Uploaded Reports', 'अपलोड की गई रिपोर्ट')}
                        </h4>
                        {historyLoading ? (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('Loading...', 'लोड हो रहा है...')}</p>
                        ) : history.length === 0 ? (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('No reports yet.', 'अभी कोई रिपोर्ट नहीं।')}</p>
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
                                    <button className="btn btn-outline btn-sm" onClick={() => handleDelete(r.id)} title={t('Delete', 'हटाएं')}>
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
                                        <div className="gauge-label">{t('Clinical Risk', 'नैदानिक जोखिम')}</div>
                                    </div>
                                </div>
                                <div className="risk-badge" style={{ background: `${getSeverityColor(cvRisk.score >= 60 ? 2 : 1)}20`, color: getSeverityColor(cvRisk.score >= 60 ? 2 : 1) }}>
                                    {cvRisk.level} {t('Risk', 'जोखिम')} ({cvRisk.message})
                                </div>
                                {cvRisk.measured?.length > 0 && (
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                                        {t('Markers used', 'उपयोग किए गए मार्कर')}: {cvRisk.measured.join(', ')}
                                    </p>
                                )}
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#f59e0b' }}>
                                <AlertTriangle size={48} strokeWidth={1} style={{ marginBottom: 12 }} />
                                <h4>{t('Insufficient Data', 'अपर्याप्त डेटा')}</h4>
                                <p style={{ fontSize: 13, padding: '0 20px' }}>{cvRisk.message || t('Could not calculate risk score.', 'जोखिम स्कोर नहीं निकाला जा सका।')}</p>
                            </div>
                        )
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            <HeartPulse size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
                            <p style={{ fontSize: 14 }}>{t('Waiting for clinical data upload...', 'रिपोर्ट अपलोड की प्रतीक्षा...')}</p>
                        </div>
                    )}
                </div>
            </div>

            {result && (
                <div className="results-container animate-in">
                    {result.report.red_flags.length > 0 && (
                        <div className="category-section red-flags">
                            <div className="category-header" onClick={() => toggleSection('red_flags')}>
                                <h4>🔴 {t('RED FLAG MARKERS', 'खतरे के संकेत')} ({result.report.red_flags.length})</h4>
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
                                <h4>🟡 {t('BORDERLINE VALUES', 'सीमा पर मान')} ({result.report.borderline.length})</h4>
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
                                <h4>⚠ {t('INCOMPLETE DATA', 'अधूरा डेटा')} ({result.report.incomplete.length})</h4>
                                {expandedSections.incomplete ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                            {expandedSections.incomplete && (
                                <div className="category-content">
                                    {result.report.incomplete.map((p, i) => (
                                        <div key={i} className="parameter-row" style={{ borderLeft: '4px solid #94a3b8', background: 'rgba(148,163,184,0.08)' }}>
                                            <div className="param-info">
                                                <span className="param-name">{p.parameter}</span>
                                                <span className="param-meta">{t('Parsing incomplete', 'पार्सिंग अधूरी')}</span>
                                            </div>
                                            <div className="param-value" style={{ color: '#64748b' }}>
                                                {t('Value Missing', 'मान अनुपलब्ध')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="category-section normal">
                        <div className="category-header" onClick={() => toggleSection('normal')}>
                            <h4>🟢 {t('NORMAL PARAMETERS', 'सामान्य मान')} ({result.report.normal.length})</h4>
                            {expandedSections.normal ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                        {expandedSections.normal && (
                            <div className="category-content">
                                {result.report.normal.length > 0 ? (
                                    result.report.normal.map((p, i) => renderParameterCard(p, i))
                                ) : (
                                    <p style={{ padding: 12, fontSize: 13, color: 'var(--text-muted)' }}>{t('No normal parameters identified.', 'कोई सामान्य मान नहीं मिला।')}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid-2" style={{ marginTop: 16 }}>
                        <div className="glass-card">
                            <h4 className="section-title"><List size={16} /> {t('Safe Lifestyle Remedies', 'सुरक्षित जीवनशैली सुझाव')}</h4>
                            <ul className="remedies-list">
                                {result.report.remedies.map((remedy, i) => (
                                    <li key={i}>{remedy}</li>
                                ))}
                            </ul>
                            <p className="disclaimer-note">
                                <Info size={12} /> {t('Lifestyle suggestions only. Consult a doctor for diagnosis.', 'केवल जीवनशैली सुझाव। निदान के लिए डॉक्टर से consult करें।')}
                            </p>
                        </div>

                        <div className="glass-card">
                            <h4 className="section-title"><Languages size={16} /> {lang === 'en' ? 'Clinical Explanation' : 'नैदानिक विवरण'}</h4>
                            <div className="explanation-text" style={{ fontSize: 14, lineHeight: 1.6 }}>
                                {lang === 'en' ? result.explanation_en : result.explanation_hi}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
