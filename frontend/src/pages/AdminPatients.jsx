import { useState, useEffect } from 'react'
import { Search, Activity, Phone, MapPin, Droplets, Calendar } from 'lucide-react'

export default function AdminPatients() {
    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [patientDetails, setPatientDetails] = useState(null)

    useEffect(() => {
        fetch('/api/admin/patients')
            .then(r => r.json())
            .then(data => {
                setPatients(data || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const handlePatientClick = (patient) => {
        setSelectedPatient(patient)
        // Fetch detailed info
        fetch(`/api/patients/${patient.id}`)
            .then(r => r.json())
            .then(data => setPatientDetails(data))
    }

    const filtered = patients.filter(p => 
        p.name?.toLowerCase().includes(search.toLowerCase()) || 
        p.village?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="animate-in" style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Patient Database</h2>
            
            <div style={{ marginBottom: 24, position: 'relative' }}>
                <Search size={20} style={{ position: 'absolute', left: 16, top: 14, opacity: 0.5 }} />
                <input 
                    type="text" 
                    placeholder="Search by name or village..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ 
                        width: '100%', padding: '14px 16px 14px 48px', 
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: 12, color: 'white', fontSize: 16, outline: 'none'
                    }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {loading ? <div style={{ opacity: 0.5 }}>Loading patients...</div> : null}
                {filtered.map(p => (
                    <div 
                        key={p.id} 
                        onClick={() => handlePatientClick(p)}
                        style={{ 
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all 0.2s' 
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{p.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, opacity: 0.7, marginBottom: 4 }}>
                            <MapPin size={14} /> {p.village || 'Unknown Village'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, opacity: 0.7 }}>
                            <Calendar size={14} /> Age: {p.age} • {p.gender}
                        </div>
                    </div>
                ))}
            </div>

            {/* Glassmorphism Modal */}
            {selectedPatient && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }} onClick={() => { setSelectedPatient(null); setPatientDetails(null); }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        borderRadius: 24, width: '90%', maxWidth: 600,
                        padding: 32, backdropFilter: 'blur(20px)',
                        color: 'white'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>{selectedPatient.name}</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <div><span style={{ opacity: 0.6 }}>Age/Gender:</span> {selectedPatient.age} / {selectedPatient.gender}</div>
                            <div><span style={{ opacity: 0.6 }}>Village:</span> {selectedPatient.village}</div>
                            <div><span style={{ opacity: 0.6 }}>Phone:</span> {selectedPatient.phone || 'N/A'}</div>
                            <div><span style={{ opacity: 0.6 }}>Blood:</span> {selectedPatient.blood_group || 'N/A'}</div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20 }}>
                            <h3 style={{ fontSize: 18, marginBottom: 12 }}>Health Overview</h3>
                            {patientDetails ? (
                                <div style={{ display: 'flex', gap: 20 }}>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, flex: 1 }}>
                                        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Reports</div>
                                        <div style={{ fontSize: 24, fontWeight: 600 }}>{patientDetails.report_count}</div>
                                    </div>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, flex: 1 }}>
                                        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Avg Risk</div>
                                        <div style={{ fontSize: 24, fontWeight: 600 }}>{patientDetails.avg_risk_score}</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ opacity: 0.5 }}>Loading health data...</div>
                            )}
                        </div>

                        <button 
                            onClick={() => { setSelectedPatient(null); setPatientDetails(null); }}
                            style={{ 
                                marginTop: 32, width: '100%', padding: 16, 
                                background: 'white', color: '#1e1b4b', border: 'none', 
                                borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer' 
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
