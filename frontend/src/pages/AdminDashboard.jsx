import { Map as MapIcon } from 'lucide-react'

export default function AdminDashboard() {
    return (
        <div className="animate-in">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Village Cluster Map</h2>
            
            <div style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 24,
                padding: 40,
                minHeight: 500,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                    <MapIcon size={40} style={{ opacity: 0.8 }} />
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Interactive Cluster Map</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 400, lineHeight: 1.6 }}>
                    This map view visualizes village clusters and health density metrics. 
                    Integrating real map coordinates or an interactive D3 graph here.
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                    <div style={{ padding: '12px 24px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: 20, fontSize: 14, fontWeight: 600 }}>12 Active Clusters</div>
                    <div style={{ padding: '12px 24px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', borderRadius: 20, fontSize: 14, fontWeight: 600 }}>45 Villages Monitored</div>
                </div>
            </div>
        </div>
    )
}
