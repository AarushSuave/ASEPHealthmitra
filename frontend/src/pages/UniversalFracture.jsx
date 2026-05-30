import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { 
    Info, Loader2, ShieldAlert, CheckCircle2, AlertTriangle, 
    Layers, Activity, Bone, Eye, Search, AlertCircle, RefreshCw, EyeOff, Sliders
} from 'lucide-react'
import HardwareInfo from '../components/HardwareInfo'

const API_BASE = ''

// Custom uploader directly embedded for robust, customized modular diagnostics
function DragDropUploader({ onFileSelect, file, preview, onClear }) {
    const [dragging, setDragging] = useState(false)
    const fileInputRef = useRef()

    const handleDrag = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragging(true)
        } else if (e.type === "dragleave") {
            setDragging(false)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0])
        }
    }

    return (
        <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current.click()}
            className={`glass-card ${dragging ? 'drag-active' : ''}`}
            style={{
                border: `2px dashed ${file ? 'var(--accent-indigo)' : dragging ? 'var(--accent-teal)' : 'rgba(255, 255, 255, 0.15)'}`,
                borderRadius: 16,
                padding: '30px 20px',
                textAlign: 'center',
                cursor: file ? 'default' : 'pointer',
                background: dragging ? 'rgba(6, 182, 212, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                transition: 'all 0.25s ease',
                position: 'relative',
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
                style={{ display: 'none' }}
            />
            {preview ? (
                <div style={{ width: '100%', position: 'relative' }}>
                    <img 
                        src={preview} 
                        alt="X-ray preview" 
                        style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 12, objectFit: 'contain' }}
                    />
                    <button 
                        onClick={(e) => {
                            e.stopPropagation()
                            onClear()
                        }}
                        className="sidebar-badge"
                        style={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            background: '#ef4444',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '4px 10px',
                            fontWeight: 'bold',
                            borderRadius: 8
                        }}
                    >
                        Remove
                    </button>
                </div>
            ) : (
                <>
                    <div style={{
                        width: 50, height: 50, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 12
                    }}>
                        🩻
                    </div>
                    <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Drag & drop X-ray image here</p>
                    <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--text-secondary)' }}>or <span style={{ color: 'var(--accent-teal)', textDecoration: 'underline' }}>browse files</span></p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Supports PNG, JPEG, WEBP up to 20MB</p>
                </>
            )}
        </div>
    )
}

// Slider image overlay for Grad-CAM explainability
function HeatmapOverlay({ imageSrc, heatmapSrc }) {
    const [opacity, setOpacity] = useState(0.45)
    
    if (!heatmapSrc) return null;

    return (
        <div className="glass-card" style={{ padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sliders size={14} color="var(--accent-teal)" /> Grad-CAM Attention Heatmap
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    Opacity: <strong>{Math.round(opacity * 100)}%</strong>
                </span>
            </div>

            <div style={{ position: 'relative', width: '100%', minHeight: 250, background: '#040712', borderRadius: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                {/* Original Base Image */}
                <img 
                    src={imageSrc} 
                    alt="X-ray Base" 
                    style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', zIndex: 1 }}
                />
                {/* Colored Attention Map overlay */}
                <img 
                    src={heatmapSrc} 
                    alt="Explainability Heatmap" 
                    style={{ 
                        position: 'absolute',
                        maxWidth: '100%', 
                        maxHeight: 300, 
                        objectFit: 'contain',
                        opacity: opacity,
                        zIndex: 2,
                        pointerEvents: 'none',
                        transition: 'opacity 0.05s linear'
                    }}
                />
            </div>

            {/* Range Opacity control slider */}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <EyeOff size={14} color="var(--text-muted)" />
                <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-teal)', height: 4, borderRadius: 2 }}
                />
                <Eye size={14} color="var(--accent-teal)" />
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
                Slide to adjust contrast overlay. Bright red areas indicate regions of interest that highly influenced the diagnostic findings.
            </p>
        </div>
    )
}

export default function UniversalFracture() {
    const [models, setModels] = useState([])
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedFile, setSelectedFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [hardwareInfo, setHardwareInfo] = useState(null)
    const [error, setError] = useState(null)
    const [showFindings, setShowFindings] = useState(true)
    const [activeTab, setActiveTab] = useState('clinical') // 'clinical', 'panoramic', or 'focused'
    const [accuracyFirst, setAccuracyFirst] = useState(true)
    const [activeHeatmapPathology, setActiveHeatmapPathology] = useState('')
    
    const canvasRef = useRef(null)

    // Colors mapping for severity levels
    const severityColors = {
        critical: '#ef4444',
        severe: '#f59e0b',
        moderate: '#818cf8',
        mild: '#10b981',
        none: '#4ade80'
    }

    const riskColors = {
        critical: '#ef4444',
        high: '#f59e0b',
        moderate: '#818cf8',
        low: '#22c55e'
    }

    const categoryBadges = {
        confirmed: { label: 'Confirmed Finding', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
        probable: { label: 'Probable Signature', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)' },
        possible: { label: 'Possible Marker', color: '#a5b4fc', bg: 'rgba(165, 180, 252, 0.12)' },
        no_abnormality: { label: 'Negative / Clear', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)' }
    }

    // Load available modular models & hardware status
    useEffect(() => {
        const loadInitData = async () => {
            try {
                const [modelsRes, hardwareRes] = await Promise.all([
                    axios.get(`${API_BASE}/api/xray/models`),
                    axios.get(`${API_BASE}/api/fracture/hardware`)
                ])
                const fetchedModels = modelsRes.data.models || []
                setModels(fetchedModels)
                setHardwareInfo(hardwareRes.data)
                
                const fracModel = fetchedModels.find(m => m.name === 'fracture')
                setSelectedModel(fracModel || fetchedModels[0] || null)
            } catch (err) {
                console.error('Failed to load X-ray diagnostic configurations:', err)
                setError('Failed to fetch modular diagnostic models. Make sure the backend server is running.')
            }
        }
        loadInitData()
    }, [])

    // Update default selected heatmap once result changes
    useEffect(() => {
        if (result && result.heatmaps && Object.keys(result.heatmaps).length > 0) {
            setActiveHeatmapPathology(Object.keys(result.heatmaps)[0])
        } else {
            setActiveHeatmapPathology('')
        }
    }, [result])

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

        let endpoint = '/api/xray/analyze-clinical'
        if (activeTab === 'panoramic') {
            endpoint = '/api/xray/analyze-comprehensive'
        } else if (activeTab === 'focused') {
            endpoint = '/api/xray/analyze'
            if (selectedModel) formData.append('model_name', selectedModel.name)
        }

        if (activeTab === 'clinical') {
            formData.append('accuracy_first', accuracyFirst ? 'true' : 'false')
        }

        try {
            const response = await axios.post(
                `${API_BASE}${endpoint}`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            )
            
            const data = response.data
            setResult(data)

            // Draw bounding boxes if visual annotations/localizations exist
            const bboxes = activeTab === 'panoramic' ? data.visual_annotations : data.localizations
            if (bboxes?.length > 0) {
                setTimeout(() => drawBoundingBoxes(bboxes, activeTab === 'panoramic'), 150)
            }
        } catch (err) {
            console.error('X-ray analysis pipeline failed:', err)
            setError(err.response?.data?.detail || 'Analysis pipeline failed. Please ensure the backend is fully loaded.')
        } finally {
            setLoading(false)
        }
    }

    const drawBoundingBoxes = (boxes, isPanoramic) => {
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
                const strokeColor = isPanoramic ? (box.color || '#ef4444') : '#ef4444'
                
                ctx.strokeStyle = strokeColor
                ctx.lineWidth = Math.max(3, Math.round(image.width / 180))
                ctx.strokeRect(x1, y1, width, height)
                ctx.fillStyle = 'rgba(239, 68, 68, 0.12)'
                ctx.fillRect(x1, y1, width, height)
                ctx.fillStyle = strokeColor
                ctx.font = `bold ${Math.max(14, Math.round(image.width / 45))}px sans-serif`
                
                const labelText = isPanoramic 
                    ? `${box.label} (${(box.confidence * 100).toFixed(0)}%)`
                    : `${(box.confidence * 100).toFixed(0)}%`
                
                ctx.fillText(labelText, x1 + 8, Math.max(22, y1 - 8))
            })
        }
        image.src = preview
    }

    return (
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            {/* Header Area */}
            <div className="glass-card glow-teal animate-in" style={{
                marginBottom: 20,
                background: 'linear-gradient(135deg, rgba(79,70,229,0.12), rgba(6, 182, 212, 0.08))'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                        width: 56, height: 56, borderRadius: 16, 
                        background: 'rgba(6, 182, 212, 0.18)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', fontSize: 26 
                    }}>
                        🩻
                    </div>
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Universal Clinical X-Ray Diagnostics</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
                            Clinical-grade pipeline ensembling multiple deep-learning architectures with adaptive histogram normalization and Grad-CAM maps.
                        </p>
                    </div>
                </div>
            </div>

            {/* Mode Tab Selector */}
            <div style={{ 
                display: 'flex', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: 12, 
                padding: 4, 
                border: '1px solid var(--border-glass)',
                marginBottom: 20
            }}>
                <button
                    onClick={() => {
                        setActiveTab('clinical')
                        setResult(null)
                        setError(null)
                    }}
                    style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 9,
                        border: 'none',
                        background: activeTab === 'clinical' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                        color: activeTab === 'clinical' ? 'var(--accent-teal)' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Activity size={15} />
                    Stage 1-7 Clinical Pipeline (High Accuracy)
                </button>
                <button
                    onClick={() => {
                        setActiveTab('panoramic')
                        setResult(null)
                        setError(null)
                    }}
                    style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 9,
                        border: 'none',
                        background: activeTab === 'panoramic' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                        color: activeTab === 'panoramic' ? 'var(--accent-teal)' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Search size={15} />
                    Panoramic System Scan
                </button>
                <button
                    onClick={() => {
                        setActiveTab('focused')
                        setResult(null)
                        setError(null)
                    }}
                    style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 9,
                        border: 'none',
                        background: activeTab === 'focused' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                        color: activeTab === 'focused' ? 'var(--accent-teal)' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Layers size={15} />
                    Targeted Focus
                </button>
            </div>

            {/* FOCUSED MODE Selector */}
            {activeTab === 'focused' && (
                <div className="animate-in">
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Layers size={16} color="var(--accent-teal)" /> Select Focused Diagnostic Target
                    </h3>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                        gap: 12, 
                        marginBottom: 24 
                    }}>
                        {models.map((model) => {
                            const isSelected = selectedModel?.name === model.name
                            const isFallback = model.status === 'fallback'
                            
                            return (
                                <div 
                                    key={model.name}
                                    onClick={() => {
                                        setSelectedModel(model)
                                        setResult(null)
                                        setError(null)
                                    }}
                                    className={`glass-card ${isSelected ? 'active-model-card' : ''}`}
                                    style={{
                                        cursor: 'pointer',
                                        border: isSelected 
                                            ? '1.5px solid var(--accent-teal)' 
                                            : '1px solid var(--border-glass)',
                                        background: isSelected 
                                            ? 'rgba(6, 182, 212, 0.08)' 
                                            : 'rgba(255,255,255,0.02)',
                                        padding: '14px 16px',
                                        borderRadius: 12,
                                        transition: 'all 0.2s ease',
                                        transform: isSelected ? 'scale(1.01)' : 'scale(1.0)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: isSelected ? 'var(--accent-teal)' : 'var(--text-primary)' }}>
                                            {model.display_name}
                                        </span>
                                        <span style={{
                                            fontSize: 9,
                                            padding: '2px 8px',
                                            borderRadius: 6,
                                            fontWeight: 'bold',
                                            background: isFallback ? 'rgba(245, 158, 11, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                                            color: isFallback ? '#fbbf24' : '#4ade80',
                                            border: isFallback ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)'
                                        }}>
                                            {isFallback ? 'DenseNet Fallback' : 'Primary Ready'}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                                        {model.description}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Diagnostics Workspace */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
                {/* Left Side: Upload & Action */}
                <div>
                    <DragDropUploader 
                        file={selectedFile}
                        preview={preview}
                        onFileSelect={handleFileSelect}
                        onClear={handleClear}
                    />

                    {/* CLINICAL MODE: Accuracy-First Toggle */}
                    {activeTab === 'clinical' && (
                        <div className="glass-card" style={{ marginTop: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <span style={{ fontWeight: 'bold', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <RefreshCw size={14} className={accuracyFirst ? 'spin' : ''} color="var(--accent-teal)" style={{ animation: accuracyFirst ? 'spin 6s linear infinite' : 'none' }} /> 
                                    Accuracy-First Diagnostics Mode
                                </span>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Applies small transformations (TTA) & consensus checks to filter false results.
                                </div>
                            </div>
                            <input 
                                type="checkbox"
                                checked={accuracyFirst}
                                onChange={(e) => setAccuracyFirst(e.target.checked)}
                                style={{ width: 34, height: 18, accentColor: 'var(--accent-teal)', cursor: 'pointer' }}
                            />
                        </div>
                    )}
                    
                    <button
                        onClick={handleAnalyze}
                        disabled={!selectedFile || loading || (activeTab === 'focused' && !selectedModel)}
                        style={{
                            width: '100%',
                            marginTop: 14,
                            padding: '13px 0',
                            borderRadius: 12,
                            border: 'none',
                            background: !selectedFile || loading
                                ? 'rgba(255,255,255,0.08)'
                                : 'linear-gradient(135deg, var(--accent-indigo), var(--accent-teal))',
                            color: !selectedFile || loading ? 'var(--text-muted)' : '#fff',
                            fontSize: 15,
                            fontWeight: 700,
                            cursor: !selectedFile || loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: selectedFile && !loading ? '0 4px 20px rgba(79,70,229,0.3)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                                Running Clinical Scanner...
                            </>
                        ) : (
                            <>
                                <Activity size={18} />
                                {activeTab === 'clinical' ? 'Run Stage 1-7 Clinical Scan' : (activeTab === 'panoramic' ? 'Run Panoramic System Scan' : `Run ${selectedModel?.display_name}`)}
                            </>
                        )}
                    </button>

                    {hardwareInfo && <HardwareInfo info={hardwareInfo} />}
                </div>

                {/* Right Side: Results Display */}
                <div>
                    {error && (
                        <div className="glass-card error-banner animate-in" style={{ marginBottom: 16, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <ShieldAlert size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                            <div>
                                <p style={{ fontWeight: 700, color: '#f87171', margin: '0 0 4px 0' }}>Pipeline Diagnostic Error</p>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{error}</p>
                            </div>
                        </div>
                    )}

                    {!result && !error && !loading && (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px', background: 'rgba(255,255,255,0.02)' }}>
                            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Awaiting Diagnostic Upload</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                                Upload an X-ray image and trigger our high-accuracy pipeline scan.
                            </p>
                        </div>
                    )}

                    {loading && (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                            <Loader2 size={36} color="var(--accent-teal)" className="spin" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                                Analyzing Bone and Soft-Tissue
                            </h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Running multi-stage ensembled clinical scanner locally.</p>
                        </div>
                    )}

                    {/* CLINICAL MODE: Hard Rejection Output if Invalid */}
                    {result && result.status === 'rejected' && (
                        <div className="glass-card error-banner animate-in" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                            <ShieldAlert size={28} color="#ef4444" style={{ flexShrink: 0 }} />
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f87171', margin: '0 0 6px 0' }}>Image Rejected by Quality Control</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                                    {result.error_message}
                                </p>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>QC Statistics:</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Focus Score: <strong>{result.qc.blur_score?.toFixed(1)}</strong> (minimum 50.0 expected)</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Avg Exposure: <strong>{result.qc.average_brightness?.toFixed(1)}</strong></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CLINICAL MODE: Successful Diagnostics Dashboard */}
                    {result && result.status === 'success' && (
                        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            
                            {/* Quality Control Warning banner if warnings exist */}
                            {result.qc.warnings && result.qc.warnings.length > 0 && (
                                <div className="glass-card animate-in" style={{ 
                                    padding: '12px 14px', 
                                    background: 'rgba(245, 158, 11, 0.06)', 
                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                    display: 'flex',
                                    gap: 10,
                                    alignItems: 'flex-start'
                                }}>
                                    <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
                                    <div>
                                        <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 'bold', marginBottom: 4 }}>
                                            Quality Control Warnings: Image quality may affect accuracy
                                        </div>
                                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                            {result.qc.warnings.map((w, wIdx) => <li key={wIdx}>{w}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Anatomical Region Recognition Card */}
                            <div className="glass-card" style={{ 
                                padding: '16px 20px', 
                                border: `1px solid ${riskColors[result.risk_level]}44`,
                                background: `${riskColors[result.risk_level]}08`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                                            Recognized Anatomical Region
                                        </div>
                                        <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span>🩻</span> {result.body_part}
                                        </h3>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{result.body_part_hi}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                                            Clinical Risk Level
                                        </div>
                                        <span style={{
                                            display: 'inline-flex',
                                            padding: '4px 12px',
                                            borderRadius: 8,
                                            fontSize: 11,
                                            fontWeight: 'bold',
                                            background: `${riskColors[result.risk_level]}22`,
                                            color: riskColors[result.risk_level],
                                            border: `1px solid ${riskColors[result.risk_level]}44`
                                        }}>
                                            {result.risk_level.toUpperCase()} RISK
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Grad-CAM Attention Heatmaps (Explainability) for Clinical mode */}
                            {activeTab === 'clinical' && result.has_heatmaps && (
                                <div>
                                    {/* Heatmap pathology selector tabs */}
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                                        {Object.keys(result.heatmaps).map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => setActiveHeatmapPathology(key)}
                                                className="sidebar-badge"
                                                style={{
                                                    cursor: 'pointer',
                                                    background: activeHeatmapPathology === key ? 'var(--accent-teal)' : 'rgba(255,255,255,0.04)',
                                                    color: activeHeatmapPathology === key ? '#000' : 'var(--text-primary)',
                                                    border: 'none',
                                                    padding: '4px 10px',
                                                    fontSize: 10,
                                                    fontWeight: 'bold',
                                                    borderRadius: 8
                                                }}
                                            >
                                                👁 {key.replace("_", " ").toUpperCase()} MAP
                                            </button>
                                        ))}
                                    </div>
                                    <HeatmapOverlay 
                                        imageSrc={preview} 
                                        heatmapSrc={result.heatmaps[activeHeatmapPathology]} 
                                    />
                                </div>
                            )}

                            {/* Focused/Panoramic Mode Canvas Annotations */}
                            {activeTab !== 'clinical' && result.has_annotations && (
                                <div className="glass-card animate-in" style={{ padding: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Visual Anomaly Annotation Map</div>
                                    <canvas ref={canvasRef} style={{ width: '100%', maxHeight: 300, objectFit: 'contain', background: '#040712', borderRadius: 8 }} />
                                </div>
                            )}

                            {/* Categorized Clinical Findings Table (Confirmed, Probable, Possible, Negative) */}
                            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle2 size={16} color="var(--accent-teal)" /> Categorized Clinical Findings
                            </h3>

                            {result.findings.map((f, index) => {
                                const badge = categoryBadges[f.category] || categoryBadges["possible"]
                                return (
                                    <div 
                                        key={index} 
                                        className="glass-card animate-in" 
                                        style={{ 
                                            padding: 16, 
                                            borderLeft: `4px solid ${f.detected ? severityColors[f.severity] : 'var(--accent-teal)'}`,
                                            background: 'rgba(255,255,255,0.02)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div>
                                                <h4 style={{ fontSize: 15, fontWeight: 800, color: f.detected ? '#f87171' : '#4ade80', margin: 0 }}>
                                                    {f.condition}
                                                </h4>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{f.condition_hi}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <span style={{
                                                    fontSize: 10,
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    fontWeight: 'bold',
                                                    background: badge.bg,
                                                    color: badge.color,
                                                    border: `1px solid ${badge.color}30`
                                                }}>
                                                    {badge.label}
                                                </span>
                                                <span style={{
                                                    fontSize: 10,
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    fontWeight: 'bold',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    color: 'var(--text-secondary)',
                                                    border: '1px solid var(--border-glass)'
                                                }}>
                                                    {(f.confidence * 100).toFixed(0)}% Conf.
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                                            <span>📍 <strong>Location:</strong> {f.location}</span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border-glass)', paddingTop: 10 }}>
                                            <div>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                                                    Medical Description
                                                </div>
                                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                                                    {f.details}
                                                </p>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                                                    चिकित्सीय विवरण (HI)
                                                </div>
                                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                                                    {f.details_hi}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            <div style={{ display: 'flex', justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                                Diagnostics processed in {result.inference_time_ms} ms.
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                .active-model-card {
                    border-color: var(--accent-teal) !important;
                    background: rgba(6, 182, 212, 0.08) !important;
                    box-shadow: 0 4px 15px rgba(6, 182, 212, 0.15) !important;
                }
                .drag-active {
                    background: rgba(6, 182, 212, 0.08) !important;
                    border-color: var(--accent-teal) !important;
                }
            `}</style>
        </div>
    )
}
