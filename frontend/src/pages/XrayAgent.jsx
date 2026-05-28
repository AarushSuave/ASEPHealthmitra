import { useState, useRef, useCallback } from 'react'
import {
    Upload, Scan, AlertTriangle, CheckCircle2, XCircle,
    Clock, ChevronDown, ChevronUp, Loader2, Info, FileImage
} from 'lucide-react'

const API_BASE = 'http://localhost:8000'

// ── Helpers ──────────────────────────────────────────────────────────────────
const riskColor = {
    low: '#22c55e',
    high: '#f59e0b',
    critical: '#ef4444',
}

const confBar = (conf) => {
    const pct = Math.round((conf || 0) * 100)
    const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <div style={{
                flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden'
            }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36 }}>{pct}%</span>
        </div>
    )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StageCard({ icon, title, status, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen)
    const borderColor = status === 'ok' ? '#22c55e' : status === 'warn' ? '#f59e0b' : status === 'error' ? '#ef4444' : '#4f46e5'

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${borderColor}33`,
            borderRadius: 14, overflow: 'hidden', marginBottom: 14
        }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 18px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-primary)'
                }}
            >
                <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: `${borderColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0
                }}>{icon}</div>
                <span style={{ fontSize: 15, fontWeight: 600, flex: 1, textAlign: 'left' }}>{title}</span>
                {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
            </button>
            {open && (
                <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${borderColor}22` }}>
                    {children}
                </div>
            )}
        </div>
    )
}

function Badge({ label, color }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
            background: `${color}22`, color, border: `1px solid ${color}55`
        }}>{label}</span>
    )
}

function PipelineStep({ step, label, active, done }) {
    const bg = done ? '#4f46e5' : active ? 'rgba(79,70,229,0.3)' : 'rgba(255,255,255,0.06)'
    const border = done ? '#4f46e5' : active ? '#4f46e560' : 'transparent'
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
                width: 28, height: 28, borderRadius: '50%', background: bg,
                border: `2px solid ${border}`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontWeight: 700,
                transition: 'all 0.3s ease', flexShrink: 0
            }}>
                {done ? '✓' : step}
            </div>
            <span style={{
                fontSize: 13, color: done ? 'var(--text-primary)' : active ? '#a5b4fc' : 'var(--text-muted)',
                fontWeight: done || active ? 600 : 400, transition: 'all 0.3s'
            }}>{label}</span>
            {active && <Loader2 size={14} color="#a5b4fc" className="spin" style={{ animation: 'spin 1s linear infinite' }} />}
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function XrayAgent() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [activeStep, setActiveStep] = useState(0) // 0=idle,1,2,3,4
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [showRaw, setShowRaw] = useState(false)
    const fileInputRef = useRef()

    const handleFile = useCallback((f) => {
        if (!f) return
        setFile(f)
        setResult(null)
        setError(null)
        setActiveStep(0)
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target.result)
        reader.readAsDataURL(f)
    }, [])

    const handleDrop = (e) => {
        e.preventDefault()
        const f = e.dataTransfer.files?.[0]
        if (f && f.type.startsWith('image/')) handleFile(f)
    }

    const handleAnalyze = async () => {
        if (!file) return
        setLoading(true)
        setResult(null)
        setError(null)

        // Simulate step progress for UX
        setActiveStep(1)
        const stepTimers = [
            setTimeout(() => setActiveStep(2), 1200),
            setTimeout(() => setActiveStep(3), 3000),
            setTimeout(() => setActiveStep(4), 5500),
        ]

        const formData = new FormData()
        formData.append('file', file)

        try {
            const resp = await fetch(`${API_BASE}/api/xray-agent/analyze`, {
                method: 'POST',
                body: formData,
            })
            stepTimers.forEach(clearTimeout)

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({ detail: resp.statusText }))
                const msg = typeof errData.detail === 'object'
                    ? errData.detail?.message || JSON.stringify(errData.detail)
                    : errData.detail || `HTTP ${resp.status}`
                throw new Error(msg)
            }
            const data = await resp.json()
            setResult(data)
            setActiveStep(5) // all done
        } catch (err) {
            stepTimers.forEach(clearTimeout)
            setError(err.message || 'Analysis failed. Please try again.')
            setActiveStep(0)
        } finally {
            setLoading(false)
        }
    }

    const riskLvl = result?.risk_level || 'low'
    const pneumoniaError = result?.pneumonia?.error
    const fractureError = result?.fracture?.error

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

            {/* Header */}
            <div className="glass-card glow-teal animate-in" style={{
                marginBottom: 24,
                background: 'linear-gradient(135deg, rgba(79,70,229,0.15), rgba(139,92,246,0.10))'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16, background: 'rgba(79,70,229,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
                    }}>🩻</div>
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                            X-Ray Sequential AI Agent
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                            Upload a frontal chest X-ray · AI validates view → detects pneumonia → detects fractures → generates bilingual report
                        </p>
                    </div>
                </div>
                <div style={{
                    marginTop: 14, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)',
                    display: 'flex', gap: 8, alignItems: 'flex-start'
                }}>
                    <Info size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: '#fbbf24', lineHeight: 1.5, margin: 0 }}>
                        <strong>Disclaimer:</strong> This AI analysis is for research and educational purposes only.
                        It is <strong>not</strong> a substitute for professional medical advice, diagnosis, or treatment.
                        Always consult a qualified radiologist.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                {/* ── Left column: upload + pipeline progress ─────────────── */}
                <div>
                    {/* Upload zone */}
                    <div
                        className="glass-card"
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => !file && fileInputRef.current?.click()}
                        style={{
                            marginBottom: 16, border: `2px dashed ${file ? '#4f46e5' : 'rgba(255,255,255,0.15)'}`,
                            borderRadius: 14, minHeight: 180, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', cursor: file ? 'default' : 'pointer',
                            transition: 'border-color 0.3s', position: 'relative', overflow: 'hidden'
                        }}
                    >
                        <input
                            ref={fileInputRef} type="file" accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                        {preview ? (
                            <>
                                <img src={preview} alt="X-ray preview"
                                    style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12 }} />
                                <div style={{
                                    position: 'absolute', bottom: 8, right: 8,
                                    background: 'rgba(0,0,0,0.6)', borderRadius: 8,
                                    padding: '4px 10px', fontSize: 12, color: '#fff'
                                }}>
                                    <FileImage size={12} style={{ marginRight: 4 }} />
                                    {file.name}
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setResult(null); setError(null) }}
                                    style={{
                                        position: 'absolute', top: 8, right: 8,
                                        background: 'rgba(239,68,68,0.8)', border: 'none',
                                        borderRadius: '50%', width: 26, height: 26,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', color: '#fff'
                                    }}
                                ><XCircle size={14} /></button>
                            </>
                        ) : (
                            <>
                                <Upload size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                                <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', margin: 0 }}>
                                    Drop chest X-ray here or <span style={{ color: '#818cf8' }}>click to browse</span>
                                </p>
                                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>JPEG · PNG · WEBP · max 20 MB</p>
                            </>
                        )}
                    </div>

                    {/* Analyze button */}
                    <button
                        onClick={handleAnalyze}
                        disabled={!file || loading}
                        style={{
                            width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                            background: !file || loading
                                ? 'rgba(255,255,255,0.08)'
                                : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            color: !file || loading ? 'var(--text-muted)' : '#fff',
                            fontSize: 15, fontWeight: 600, cursor: !file || loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            transition: 'all 0.2s ease', marginBottom: 20,
                            boxShadow: file && !loading ? '0 4px 20px rgba(79,70,229,0.35)' : 'none'
                        }}
                    >
                        {loading
                            ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
                            : <><Scan size={18} /> Run Sequential Agent</>}
                    </button>

                    {/* Pipeline progress */}
                    <div className="glass-card" style={{ padding: '16px 18px' }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Pipeline Stages
                        </h4>
                        <PipelineStep step="1" label="View Validation (AP/PA check)" active={activeStep === 1} done={activeStep > 1} />
                        <PipelineStep step="2" label="Pneumonia Detection (YOLOv8m)" active={activeStep === 2} done={activeStep > 2} />
                        <PipelineStep step="3" label="Fracture Detection (ChexFract)" active={activeStep === 3} done={activeStep > 3} />
                        <PipelineStep step="4" label="Bilingual Report Synthesis" active={activeStep === 4} done={activeStep > 4} />

                        {result && (
                            <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4ade80', fontWeight: 600 }}>
                                    <CheckCircle2 size={14} /> Analysis complete
                                </div>
                                {result.pipeline_timings && (
                                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                                        <Clock size={10} style={{ marginRight: 4 }} />
                                        Total: {result.pipeline_timings.total_ms?.toFixed(0)} ms
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right column: results ────────────────────────────────── */}
                <div>
                    {error && (
                        <div className="glass-card animate-in" style={{
                            border: '1px solid rgba(239,68,68,0.4)',
                            background: 'rgba(239,68,68,0.08)', marginBottom: 16
                        }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                                <div>
                                    <p style={{ fontWeight: 600, color: '#f87171', marginBottom: 4 }}>Analysis Failed</p>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!result && !error && !loading && (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '50px 24px' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🩻</div>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                                Upload a frontal chest X-ray and click <strong>Run Sequential Agent</strong> to begin analysis.
                            </p>
                        </div>
                    )}

                    {loading && !result && (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '50px 24px' }}>
                            <Loader2 size={40} color="#818cf8" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                                Running sequential AI analysis…<br />
                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>This may take 10–60 seconds depending on models loaded.</span>
                            </p>
                        </div>
                    )}

                    {result && (
                        <div className="animate-in">
                            {/* Risk banner */}
                            <div style={{
                                padding: '12px 18px', borderRadius: 12, marginBottom: 14,
                                background: `${riskColor[riskLvl]}18`,
                                border: `1px solid ${riskColor[riskLvl]}44`,
                                display: 'flex', alignItems: 'center', gap: 10
                            }}>
                                <span style={{ fontSize: 22 }}>
                                    {riskLvl === 'critical' ? '🚨' : riskLvl === 'high' ? '⚠️' : '✅'}
                                </span>
                                <div>
                                    <div style={{ fontWeight: 700, color: riskColor[riskLvl], fontSize: 14 }}>
                                        {riskLvl === 'critical' ? 'Critical Findings' : riskLvl === 'high' ? 'Significant Findings' : 'No Critical Findings'}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        Overall risk level: <strong style={{ color: riskColor[riskLvl] }}>{riskLvl.toUpperCase()}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Stage: View */}
                            <StageCard icon="🔍" title="Step 1 · View Validation"
                                status={result.view?.valid ? 'ok' : 'error'} defaultOpen={false}>
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>View</span>
                                        <Badge label={result.view?.view || 'Unknown'} color="#818cf8" />
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Confidence</div>
                                    {confBar(result.view?.confidence)}
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>{result.view?.message}</p>
                                </div>
                            </StageCard>

                            {/* Stage: Pneumonia */}
                            <StageCard icon="🫁" title="Step 2 · Pneumonia Detection"
                                status={pneumoniaError ? 'error' : (result.pneumonia?.detected ? 'error' : 'ok')} defaultOpen>
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Result</span>
                                        {pneumoniaError ? (
                                            <Badge label="⚠ Model unavailable" color="#f59e0b" />
                                        ) : (
                                            <Badge
                                                label={result.pneumonia?.detected ? '⚠ Pneumonia Detected' : '✓ No Pneumonia'}
                                                color={result.pneumonia?.detected ? '#ef4444' : '#22c55e'}
                                            />
                                        )}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Confidence</div>
                                    {confBar(result.pneumonia?.confidence)}
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>{result.pneumonia?.details}</p>
                                    {!pneumoniaError && result.pneumonia?.simulation && (
                                        <Badge label="Simulation Mode" color="#f59e0b" />
                                    )}
                                </div>
                            </StageCard>

                            {/* Stage: Fracture */}
                            <StageCard icon="🦴" title="Step 3 · Fracture Detection"
                                status={fractureError ? 'error' : (result.fracture?.detected ? 'warn' : 'ok')} defaultOpen>
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Result</span>
                                        {fractureError ? (
                                            <Badge label="⚠ Model unavailable" color="#f59e0b" />
                                        ) : (
                                            <Badge
                                                label={result.fracture?.detected ? '⚠ Fracture Detected' : '✓ No Fracture'}
                                                color={result.fracture?.detected ? '#f59e0b' : '#22c55e'}
                                            />
                                        )}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Confidence</div>
                                    {confBar(result.fracture?.confidence)}
                                    {result.fracture?.locations?.length > 0 && (
                                        <p style={{ fontSize: 12, color: '#fbbf24', marginTop: 8 }}>
                                            📍 {result.fracture.locations.join(', ')}
                                        </p>
                                    )}
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                        {(result.fracture?.description || '').slice(0, 200)}
                                        {((result.fracture?.description || '').length > 200) ? '…' : ''}
                                    </p>
                                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                                        Model: {result.fracture?.model_used}
                                        {!fractureError && result.fracture?.simulation && <Badge label="Simulation" color="#f59e0b" />}
                                    </div>
                                </div>
                            </StageCard>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Full Bilingual Report ────────────────────────────────────── */}
            {result?.report && (
                <div className="glass-card animate-in" style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            📋 Full Bilingual Report
                        </h3>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                via {result.report_provider}
                            </span>
                            <button onClick={() => setShowRaw(!showRaw)} style={{
                                fontSize: 11, padding: '3px 10px', borderRadius: 8,
                                border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-muted)', cursor: 'pointer'
                            }}>
                                {showRaw ? 'Formatted' : 'Raw'}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* English */}
                        <div style={{
                            background: 'rgba(79,70,229,0.08)', borderRadius: 10, padding: 16,
                            border: '1px solid rgba(79,70,229,0.2)'
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', marginBottom: 10, letterSpacing: '0.05em' }}>
                                🇬🇧 ENGLISH
                            </div>
                            <pre style={{
                                whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13,
                                color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0
                            }}>
                                {(result.report_en || result.report || '').replace('--- ENGLISH REPORT ---', '').trim()}
                            </pre>
                        </div>

                        {/* Hindi */}
                        <div style={{
                            background: 'rgba(245,158,11,0.08)', borderRadius: 10, padding: 16,
                            border: '1px solid rgba(245,158,11,0.2)'
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 10, letterSpacing: '0.05em' }}>
                                🇮🇳 हिंदी
                            </div>
                            <pre style={{
                                whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13,
                                color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0
                            }}>
                                {(result.report_hi || 'Hindi report not available.').replace('--- हिंदी रिपोर्ट ---', '').trim()}
                            </pre>
                        </div>
                    </div>

                    {/* Timing breakdown */}
                    {result.pipeline_timings && (
                        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {Object.entries(result.pipeline_timings).map(([k, v]) => (
                                <div key={k} style={{
                                    fontSize: 11, color: 'var(--text-muted)', padding: '3px 10px',
                                    background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid var(--border-glass)'
                                }}>
                                    ⏱ {k.replace(/_ms$/, '').replace(/_/g, ' ')}: <strong>{v.toFixed(0)} ms</strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
