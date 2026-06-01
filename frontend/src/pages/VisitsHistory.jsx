import { useState, useEffect } from 'react'
import { Calendar, MapPin, User, CheckCircle } from 'lucide-react'
import { useAuth } from '../AuthContext'

export default function VisitsHistory() {
    const { token } = useAuth()
    const [visits, setVisits] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/visits/', { headers: { 'Authorization': `Bearer ${token}` }})
            .then(r => r.json())
            .then(data => {
                setVisits(data || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [token])

    const completedVisits = visits.filter(v => v.status === 'completed')

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Previous Visits History</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {loading ? <p>Loading history...</p> : null}
                {completedVisits.length === 0 && !loading && (
                    <div className="glass-card" style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>
                        No completed visits yet.
                    </div>
                )}
                {completedVisits.map(v => (
                    <div key={v.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <User size={18} /> {v.patient_name}
                            </h3>
                            <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {v.village_name}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={14} /> {new Date(v.visit_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '8px 16px', borderRadius: 20 }}>
                            <CheckCircle size={18} />
                            Completed
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
