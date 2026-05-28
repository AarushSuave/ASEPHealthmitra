import { AlertCircle, CheckCircle, Clock, HeartHandshake, ShieldAlert } from 'lucide-react'

export default function FractureResultCard({ result }) {
    if (!result) return null

    const severityStyle = getSeverityStyle(result.severity)
    const confidenceValue = parseFloat(result.confidence_percent) || 0

    return (
        <div className="glass-card animate-in" style={{
            padding: 24,
            borderRadius: 'var(--radius-lg)',
            border: severityStyle.border,
            boxShadow: severityStyle.shadow,
            background: severityStyle.bg
        }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 42, marginBottom: 12 }}>{result.detected ? 'Bone' : 'OK'}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                    {result.message_en}
                </h3>
                <p style={{ fontSize: 16, fontWeight: 500, color: severityStyle.color, margin: 0 }}>
                    {result.message_hi}
                </p>
            </div>

            {result.detected && (
                <div style={{
                    background: 'rgba(0,0,0,0.15)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    border: '1px solid var(--border-glass)',
                    marginBottom: 20
                }}>
                    <ResultRow label="Fracture Classification" value={result.fracture_type?.replaceAll('_', ' ')} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Severity Grade</span>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: 6,
                            color: severityStyle.color,
                            border: `1px solid ${severityStyle.color}40`,
                            textTransform: 'uppercase'
                        }}>
                            {severityStyle.icon}
                            {result.severity_en}
                        </span>
                    </div>
                    <div style={{ marginTop: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Model Confidence</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: severityStyle.color }}>{result.confidence_percent}</span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${confidenceValue}%`, height: '100%', background: severityStyle.color, borderRadius: 99 }} />
                        </div>
                    </div>
                </div>
            )}

            {recommendationBlock(result.recommendation)}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>Backend: {result.backend || 'unknown'}</span>
                <span>Hardware: {result.hardware_info?.available_accelerators?.join(', ') || 'CPU'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> {result.inference_time_ms ? `${result.inference_time_ms.toFixed(0)} ms` : '--'}
                </span>
            </div>
        </div>
    )
}

function ResultRow({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize', textAlign: 'right' }}>{value}</span>
        </div>
    )
}

function recommendationBlock(recommendation) {
    if (!recommendation) return null
    return (
        <div style={{
            background: 'rgba(6, 182, 212, 0.04)',
            border: '1px solid rgba(6, 182, 212, 0.15)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: 16
        }}>
            <h4 style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--accent-teal)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                textTransform: 'uppercase'
            }}>
                <HeartHandshake size={15} /> Action Plan / कार्य योजना
            </h4>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
                {recommendation.en}
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 10 }}>
                {recommendation.hi}
            </p>
        </div>
    )
}

function getSeverityStyle(severity) {
    switch (severity) {
        case 'critical':
            return style('#ef4444', 'rgba(239,68,68,0.1)', <ShieldAlert size={20} color="#ef4444" />)
        case 'severe':
            return style('#f87171', 'rgba(239,68,68,0.08)', <AlertCircle size={20} color="#f87171" />)
        case 'moderate':
            return style('#f59e0b', 'rgba(245,158,11,0.08)', <AlertCircle size={20} color="#f59e0b" />)
        case 'mild':
            return style('#eab308', 'rgba(234,179,8,0.06)', <AlertCircle size={20} color="#eab308" />)
        default:
            return style('#10b981', 'rgba(16,185,129,0.08)', <CheckCircle size={20} color="#10b981" />)
    }
}

function style(color, bg, icon) {
    return {
        bg,
        border: `1px solid ${color}55`,
        color,
        shadow: `0 0 12px ${color}22`,
        icon
    }
}
