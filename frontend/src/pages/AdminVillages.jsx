import { useState, useEffect } from 'react'
import { MapPin, Users, Activity } from 'lucide-react'
import { useAuth } from '../AuthContext'

export default function AdminVillages() {
  const { token } = useAuth()
  const [villages, setVillages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch('/api/admin/villages', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setVillages(data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token])

  return (
    <div className="animate-in">
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Village Statistics</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
        {loading ? <div style={{ opacity: 0.5 }}>Loading villages...</div> : null}
        {villages.map((v, i) => (
          <div 
            key={i}
            style={{ 
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: 20, padding: 24
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={24} color="#60a5fa" />
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 600 }}>{v.village || 'Unknown'}</h3>
                <div style={{ fontSize: 13, opacity: 0.6 }}>Active Region</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12 }}>
                <Users size={16} style={{ marginBottom: 8, color: '#34d399' }} />
                <div style={{ fontSize: 24, fontWeight: 700 }}>{v.patient_count}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Total Patients</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12 }}>
                <Activity size={16} style={{ marginBottom: 8, color: '#f87171' }} />
                <div style={{ fontSize: 24, fontWeight: 700 }}>{v.avg_risk_score}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Avg Risk</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
