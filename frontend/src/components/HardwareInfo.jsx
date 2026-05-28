import { Cpu, HardDrive, ShieldAlert, Zap } from 'lucide-react'

export default function HardwareInfo({ info }) {
    if (!info) return null

    const accelerators = info.available_accelerators || []
    const hasAccelerator = accelerators.some((item) => item !== 'CPU')

    return (
        <div className="glass-card glow-teal animate-in" style={{
            marginBottom: 24,
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(139, 92, 246, 0.08))',
            padding: '20px 24px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 46,
                        height: 46,
                        borderRadius: 'var(--radius-md)',
                        background: hasAccelerator ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Zap size={22} color={hasAccelerator ? 'var(--accent-green)' : 'var(--accent-teal)'} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Offline Neural Engine Status</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                            Device: <strong style={{ color: 'var(--text-primary)' }}>{info.processor || 'Generic CPU'}</strong> ({info.architecture})
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {accelerators.length > 0 ? accelerators.map((acc) => (
                        <span key={acc} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 12px',
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 700,
                            background: acc === 'CPU' ? 'rgba(255,255,255,0.05)' : 'rgba(16, 185, 129, 0.12)',
                            color: acc === 'CPU' ? 'var(--text-secondary)' : 'var(--accent-green)',
                            border: acc === 'CPU' ? '1px solid var(--border-glass)' : '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                            <Cpu size={12} /> {acc}
                        </span>
                    )) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent-orange)' }}>
                            <ShieldAlert size={12} /> CPU mode
                        </span>
                    )}
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 16,
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid var(--border-glass)'
            }}>
                <InfoItem icon={<HardDrive size={16} />} label="Platform" value={`${info.platform} ${info.platform_release}`} />
                <InfoItem icon={<Cpu size={16} />} label="CPU Cores" value={`${info.cpu_count || '?'} threads (${info.cpu_physical_cores || '?'} cores)`} />
                <InfoItem icon={<HardDrive size={16} />} label="Memory" value={`${info.ram_gb || '?'} GB RAM`} />
            </div>
        </div>
    )
}

function InfoItem({ icon, label, value }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
            <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
            </div>
        </div>
    )
}
