import { useState, useEffect } from 'react'
import { Calendar, QrCode, MapPin, User, CheckCircle, Plus } from 'lucide-react'
import { useAuth } from '../AuthContext'

export default function VisitPlanner() {
    const { token } = useAuth()
    const [visits, setVisits] = useState([])
    const [loading, setLoading] = useState(true)
    const [showScanner, setShowScanner] = useState(false)
    const [scanResult, setScanResult] = useState(null)
    const [activeTab, setActiveTab] = useState('upcoming') // upcoming, add

    // Form
    const [patientName, setPatientName] = useState('')
    const [villageName, setVillageName] = useState('')
    const [date, setDate] = useState('')
    const [purpose, setPurpose] = useState('')

    useEffect(() => {
        fetchVisits()
    }, [])

    const fetchVisits = () => {
        fetch('/api/visits/', { headers: { 'Authorization': `Bearer ${token}` }})
            .then(r => r.json())
            .then(data => {
                setVisits(data || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        const payload = {
            patient_name: patientName,
            village_name: villageName,
            visit_date: new Date(date).toISOString(),
            purpose: purpose,
            notes: ''
        }
        await fetch('/api/visits/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        })
        setActiveTab('upcoming')
        fetchVisits()
    }

    const mockScan = (visitId) => {
        setScanResult('Scanning...')
        setTimeout(() => {
            fetch(`/api/visits/${visitId}/complete`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(() => {
                setScanResult('Check-in Successful!')
                setTimeout(() => {
                    setShowScanner(false)
                    setScanResult(null)
                    fetchVisits()
                }, 2000)
            })
        }, 1500)
    }

    const upcomingVisits = visits.filter(v => v.status === 'scheduled')

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Visit Planner</h2>
                <div style={{ display: 'flex', gap: 8, background: 'var(--bg-card)', padding: 4, borderRadius: 12 }}>
                    <button 
                        onClick={() => setActiveTab('upcoming')}
                        style={{ padding: '8px 16px', borderRadius: 8, background: activeTab === 'upcoming' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'upcoming' ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Upcoming
                    </button>
                    <button 
                        onClick={() => setActiveTab('add')}
                        style={{ padding: '8px 16px', borderRadius: 8, background: activeTab === 'add' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'add' ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Add Visit
                    </button>
                </div>
            </div>

            {activeTab === 'upcoming' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {loading ? <p>Loading visits...</p> : null}
                    {upcomingVisits.length === 0 && !loading && (
                        <div className="glass-card" style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>
                            No upcoming visits scheduled.
                        </div>
                    )}
                    {upcomingVisits.map(v => (
                        <div key={v.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <User size={18} /> {v.patient_name}
                                </h3>
                                <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {v.village_name}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={14} /> {new Date(v.visit_date).toLocaleDateString()}</span>
                                </div>
                                <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-primary)' }}>Purpose: {v.purpose}</div>
                            </div>
                            <button 
                                onClick={() => { setShowScanner(true); mockScan(v.id); }}
                                className="btn-primary" 
                                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                <QrCode size={18} />
                                QR Check-in
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'add' && (
                <div className="glass-card" style={{ maxWidth: 500 }}>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Patient Name</label>
                            <input type="text" className="input-field" required value={patientName} onChange={e => setPatientName(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Village Name</label>
                            <input type="text" className="input-field" required value={villageName} onChange={e => setVillageName(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Visit Date</label>
                            <input type="datetime-local" className="input-field" required value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Purpose</label>
                            <input type="text" className="input-field" required value={purpose} onChange={e => setPurpose(e.target.value)} />
                        </div>
                        <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>Schedule Visit</button>
                    </form>
                </div>
            )}

            {/* QR Scanner Modal (Mock) */}
            {showScanner && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div style={{
                        background: 'var(--bg-card)', padding: 40, borderRadius: 24, textAlign: 'center',
                        border: '1px solid var(--border-glass)', width: '90%', maxWidth: 400
                    }}>
                        <QrCode size={64} style={{ marginBottom: 24, color: 'var(--primary-color)' }} />
                        <h3 style={{ fontSize: 20, marginBottom: 16 }}>
                            {scanResult || 'Align QR Code within frame'}
                        </h3>
                        {scanResult === 'Check-in Successful!' && <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto' }} />}
                    </div>
                </div>
            )}
        </div>
    )
}
