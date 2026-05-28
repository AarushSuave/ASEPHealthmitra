import { useRef } from 'react'
import { FileImage, Settings, Upload, XCircle } from 'lucide-react'

export default function ImageUploader({ file, preview, onFileSelect, onClear, includeLocalization, setIncludeLocalization }) {
    const fileInputRef = useRef()

    const selectFile = (candidate) => {
        if (candidate && candidate.type.startsWith('image/')) onFileSelect(candidate)
    }

    return (
        <div className="glass-card" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={18} /> Upload Full-Body X-Ray
            </h3>

            <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                    event.preventDefault()
                    selectFile(event.dataTransfer.files?.[0])
                }}
                onClick={() => !file && fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${file ? 'var(--accent-teal)' : 'var(--border-glass)'}`,
                    background: file ? 'rgba(6, 182, 212, 0.03)' : 'rgba(255,255,255,0.01)',
                    borderRadius: 'var(--radius-md)',
                    padding: file ? 12 : '40px 20px',
                    textAlign: 'center',
                    cursor: file ? 'default' : 'pointer',
                    position: 'relative'
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/bmp,image/tiff"
                    style={{ display: 'none' }}
                    onChange={(event) => selectFile(event.target.files?.[0])}
                />

                {preview ? (
                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
                        <img src={preview} alt="X-ray preview" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', background: '#040712', borderRadius: 'var(--radius-sm)' }} />
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation()
                                onClear()
                            }}
                            style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(239, 68, 68, 0.85)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
                        >
                            <XCircle size={16} />
                        </button>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', padding: '12px 16px', textAlign: 'left', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileImage size={16} color="var(--accent-teal)" />
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{file?.name}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{readableSize(file?.size)}</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <FileImage size={42} style={{ marginBottom: 12, color: 'var(--accent-teal)' }} />
                        <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                            Drop an X-ray image here or <span style={{ color: 'var(--accent-teal)' }}>browse</span>
                        </h4>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
                            JPEG, PNG, BMP, TIFF. Max 20MB. Works for hand, arm, leg, hip, shoulder, spine, and other skeletal X-rays.
                        </p>
                    </div>
                )}
            </div>

            <div style={{ marginTop: 18, padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Settings size={15} color="var(--text-secondary)" />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Optional localization</span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={includeLocalization} onChange={(event) => setIncludeLocalization(event.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent-teal)' }} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>YOLO boxes</span>
                </label>
            </div>
        </div>
    )
}

function readableSize(bytes) {
    if (!bytes) return ''
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
}
