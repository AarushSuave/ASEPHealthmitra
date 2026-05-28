import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Info, Loader2, ShieldAlert } from 'lucide-react'
import HardwareInfo from '../components/HardwareInfo'
import ImageUploader from '../components/ImageUploader'
import FractureResultCard from '../components/FractureResultCard'

const API_BASE = '/api/fracture'

export default function UniversalFracture() {
    const [selectedFile, setSelectedFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [hardwareInfo, setHardwareInfo] = useState(null)
    const [serviceHealth, setServiceHealth] = useState(null)
    const [fractureTypes, setFractureTypes] = useState([])
    const [includeLocalization, setIncludeLocalization] = useState(true)
    const [error, setError] = useState(null)
    const canvasRef = useRef(null)

    useEffect(() => {
        const loadInfo = async () => {
            try {
                const [healthRes, hardwareRes, typesRes] = await Promise.all([
                    axios.get(`${API_BASE}/health`),
                    axios.get(`${API_BASE}/hardware`),
                    axios.get(`${API_BASE}/supported-types`)
                ])
                setServiceHealth(healthRes.data)
                setHardwareInfo(hardwareRes.data)
                setFractureTypes(typesRes.data.fracture_types || [])
            } catch (err) {
                console.error('Failed to load fracture detection info:', err)
                setError('Could not connect to the offline fracture detection service. Make sure the backend is running.')
            }
        }
        loadInfo()
    }, [])

    const handleFileSelect = (file) => {
        setSelectedFile(file)
        setPreview(URL.createObjectURL(file))
        setResult(null)
        setError(null)
    }

    const handleClear = () => {
        setSelectedFile(null)
        setPreview(null)
        setResult(null)
        setError(null)
    }

    const handleAnalyze = async () => {
        if (!selectedFile) return

        setLoading(true)
        setError(null)
        setResult(null)

        const formData = new FormData()
        formData.append('file', selectedFile)

        try {
            const response = await axios.post(
                `${API_BASE}/detect?include_localization=${includeLocalization}&return_all_probabilities=true`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            )
            setResult(response.data)

            if (response.data.localizations?.length > 0) {
                setTimeout(() => drawBoundingBoxes(response.data.localizations), 150)
            }
        } catch (err) {
            console.error(err)
            setError(err.response?.data?.detail || 'Analysis failed. Please make sure the backend is online and try again.')
        } finally {
            setLoading(false)
        }
    }

    const drawBoundingBoxes = (boxes) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const image = new Image()
        image.onload = () => {
            canvas.width = image.width
            canvas.height = image.height
            ctx.drawImage(image, 0, 0)
            boxes.forEach((box) => {
                const [x1, y1, x2, y2] = box.bbox
                const width = x2 - x1
                const height = y2 - y1
                ctx.strokeStyle = '#ef4444'
                ctx.lineWidth = Math.max(3, Math.round(image.width / 200))
                ctx.strokeRect(x1, y1, width, height)
                ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
                ctx.fillRect(x1, y1, width, height)
                ctx.fillStyle = '#ef4444'
                ctx.font = `bold ${Math.max(12, Math.round(image.width / 50))}px sans-serif`
                ctx.fillText(`${(box.confidence * 100).toFixed(0)}%`, x1 + 6, Math.max(16, y1 - 6))
            })
        }
        image.src = preview
    }

    const modelMissing = serviceHealth?.status === 'model_missing'

    return (
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <div className="glass-card glow-teal animate-in" style={{
                marginBottom: 24,
                background: 'linear-gradient(135deg, rgba(79,70,229,0.15), rgba(6, 182, 212, 0.10))'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                        XR
                    </div>
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Universal Full Body Fracture Detection</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                            Offline fracture classification for hand, arm, leg, hip, shoulder, spine, and other skeletal X-rays.
                        </p>
                    </div>
                </div>
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Info size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: '#fbbf24', lineHeight: 1.5, margin: 0 }}>
                        This system requires trained fracture weights before diagnostic use. AI output assists triage only and must be reviewed by a qualified clinician.
                    </p>
                </div>
            </div>

            {hardwareInfo && <HardwareInfo info={hardwareInfo} />}

            {modelMissing && (
                <div className="glass-card animate-in" style={{ marginBottom: 20, border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.08)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', marginBottom: 8 }}>Model weights are not installed yet</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                        Place a trained classifier at <code>backend/models/fracture_model.h5</code>, <code>fracture_model.keras</code>, or <code>fracture_model.onnx</code>.
                        Optional YOLO localization weights go at <code>backend/models/yolov8_fracture.pt</code>.
                    </p>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                <div>
                    <ImageUploader
                        file={selectedFile}
                        preview={preview}
                        onFileSelect={handleFileSelect}
                        onClear={handleClear}
                        includeLocalization={includeLocalization}
                        setIncludeLocalization={setIncludeLocalization}
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={!selectedFile || loading || modelMissing}
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="spin" style={{ marginRight: 8 }} />
                                Processing Scan...
                            </>
                        ) : (
                            'Run Fracture Diagnosis'
                        )}
                    </button>
                </div>

                <div>
                    {error && <ErrorBox message={error} />}

                    {!result && !error && !loading && (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '50px 24px' }}>
                            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Awaiting X-Ray Upload</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                                Upload a skeletal X-ray image to run full-body fracture classification.
                            </p>
                        </div>
                    )}

                    {loading && !result && (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '50px 24px' }}>
                            <Loader2 size={36} color="var(--accent-teal)" className="spin" style={{ marginBottom: 16 }} />
                            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Analyzing Bone Structures</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Running local inference on the best available backend.</p>
                        </div>
                    )}

                    {result && (
                        <>
                            {result.has_localizations && (
                                <div className="glass-card animate-in" style={{ padding: 12, marginBottom: 16 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Localization Bounding Box</div>
                                    <canvas ref={canvasRef} style={{ width: '100%', maxHeight: 300, objectFit: 'contain', background: '#040712', borderRadius: 'var(--radius-sm)' }} />
                                </div>
                            )}
                            <FractureResultCard result={result} />
                        </>
                    )}
                </div>
            </div>

            {fractureTypes.length > 0 && (
                <div className="glass-card animate-in" style={{ marginTop: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Supported classes</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {fractureTypes.map((type) => (
                            <span key={type.code} className="sidebar-badge" title={type.name_hi}>{type.name_en}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function ErrorBox({ message }) {
    return (
        <div className="glass-card error-banner animate-in" style={{ marginBottom: 16, background: 'rgba(239, 68, 68, 0.08)' }}>
            <ShieldAlert size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            <div>
                <p style={{ fontWeight: 700, color: '#f87171', margin: '0 0 4px 0' }}>Diagnosis Error</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{message}</p>
            </div>
        </div>
    )
}
