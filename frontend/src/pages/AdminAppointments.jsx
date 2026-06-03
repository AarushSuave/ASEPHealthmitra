import { useState, useEffect } from 'react'
import { Calendar, MapPin, KeyRound, User } from 'lucide-react'
import { useAuth } from '../AuthContext'

export default function AdminAppointments() {
    const { token } = useAuth()
    const [visits, setVisits] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!token) return
        fetch('/api/admin/visits', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                setVisits(Array.isArray(data) ? data : [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [token])

    return (
        <div className="animate-in">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Upcoming Appointments</h2>
            <p style={{ opacity: 0.7, marginBottom: 24, maxWidth: 560 }}>
                Each visit gets an auto-generated check-in code. Give this code to the patient at the front desk so they can check in from their app.
            </p>

            {loading && <div style={{ opacity: 0.6 }}>Loading appointments...</div>}

            {!loading && visits.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 16 }}>
                    No scheduled visits yet.
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {visits.map(v => (
                    <div
                        key={v.id}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 16,
                            padding: 20,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 16,
                        }}
                    >
                        <div>
                            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <User size={18} /> {v.patient_name}
                            </h3>
                            <div style={{ display: 'flex', gap: 16, fontSize: 14, opacity: 0.8, flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {v.village_name}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Calendar size={14} /> {v.visit_date ? new Date(v.visit_date).toLocaleString() : '—'}
                                </span>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 14 }}>Purpose: {v.purpose}</div>
                        </div>
                        <div style={{
                            textAlign: 'center',
                            padding: '12px 20px',
                            background: 'rgba(16,185,129,0.15)',
                            borderRadius: 12,
                            border: '1px dashed rgba(16,185,129,0.5)',
                            minWidth: 140,
                        }}>
                            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <KeyRound size={12} /> Check-in code
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3, fontFamily: 'monospace' }}>
                                {v.check_in_code || '—'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
