import { useState, useEffect } from 'react'
import { Calendar, KeyRound, MapPin, User, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../AuthContext'

export default function VisitPlanner() {
    const { token, user } = useAuth()
    const [visits, setVisits] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('upcoming')
    const [checkInVisitId, setCheckInVisitId] = useState(null)
    const [checkInCode, setCheckInCode] = useState('')
    const [checkInError, setCheckInError] = useState('')
    const [checkInSuccess, setCheckInSuccess] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [date, setDate] = useState('')
    const [purpose, setPurpose] = useState('')

    const profileName = user?.name || ''
    const profileVillage = user?.village || ''

    useEffect(() => {
        if (token) fetchVisits()
    }, [token])

    const fetchVisits = () => {
        fetch('/api/visits/', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                setVisits(Array.isArray(data) ? data : [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!profileName || !profileVillage) {
            alert('Please set your name and village in Profile before scheduling a visit.')
            return
        }
        const payload = {
            patient_name: profileName,
            village_name: profileVillage,
            visit_date: new Date(date).toISOString(),
            purpose: purpose,
            notes: '',
        }
        await fetch('/api/visits/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
        })
        setDate('')
        setPurpose('')
        setActiveTab('upcoming')
        fetchVisits()
    }

    const openCheckIn = (visitId) => {
        setCheckInVisitId(visitId)
        setCheckInCode('')
        setCheckInError('')
        setCheckInSuccess(false)
    }

    const submitCheckIn = async (e) => {
        e.preventDefault()
        if (!checkInCode.trim()) {
            setCheckInError('Enter the code given by hospital staff.')
            return
        }
        setSubmitting(true)
        setCheckInError('')
        try {
            const res = await fetch(`/api/visits/${checkInVisitId}/check-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ code: checkInCode.trim() }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Check-in failed')
            setCheckInSuccess(true)
            setTimeout(() => {
                setCheckInVisitId(null)
                setCheckInSuccess(false)
                fetchVisits()
            }, 2000)
        } catch (err) {
            setCheckInError(err.message)
        }
        setSubmitting(false)
    }

    const upcomingVisits = visits.filter(v => v.status === 'scheduled')

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <h2>Visit Planner / विज़िट योजना</h2>
                <div style={{ display: 'flex', gap: 8, background: 'var(--bg-card)', padding: 4, borderRadius: 12 }}>
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        style={{ padding: '8px 16px', borderRadius: 8, background: activeTab === 'upcoming' ? 'var(--accent-teal)' : 'transparent', color: activeTab === 'upcoming' ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Upcoming / अगली विज़िट
                    </button>
                    <button
                        onClick={() => setActiveTab('add')}
                        style={{ padding: '8px 16px', borderRadius: 8, background: activeTab === 'add' ? 'var(--accent-teal)' : 'transparent', color: activeTab === 'add' ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Add Visit / नई विज़िट
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
                        <div key={v.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <User size={18} /> {v.patient_name}
                                </h3>
                                <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {v.village_name}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={14} /> {new Date(v.visit_date).toLocaleString()}</span>
                                </div>
                                <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-primary)' }}>Purpose: {v.purpose}</div>
                                <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                                    At the hospital, enter the check-in code given to you by staff (shown in OurHealth Admin).
                                </p>
                            </div>
                            <button
                                onClick={() => openCheckIn(v.id)}
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                <KeyRound size={18} />
                                Enter Check-in Code
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'add' && (
                <div className="glass-card" style={{ maxWidth: 520 }}>
                    <div style={{ marginBottom: 20, padding: 14, borderRadius: 12, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>FROM YOUR PROFILE</div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600 }}>
                                <User size={16} /> {profileName || '— Set name in Profile'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600 }}>
                                <MapPin size={16} /> {profileVillage || '— Set village in Profile'}
                            </div>
                        </div>
                    </div>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Visit Date & Time</label>
                            <input type="datetime-local" className="form-input" required value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Purpose</label>
                            <input type="text" className="form-input" required value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Follow-up checkup" />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }} disabled={!profileName || !profileVillage}>
                            Schedule Visit
                        </button>
                    </form>
                </div>
            )}

            {checkInVisitId && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                }}>
                    <div style={{
                        background: 'var(--bg-card)', padding: 32, borderRadius: 24,
                        border: '1px solid var(--border-glass)', width: '90%', maxWidth: 400,
                    }}>
                        {checkInSuccess ? (
                            <div style={{ textAlign: 'center' }}>
                                <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
                                <h3>Check-in successful!</h3>
                            </div>
                        ) : (
                            <form onSubmit={submitCheckIn}>
                                <KeyRound size={40} style={{ marginBottom: 16, color: 'var(--accent-teal)' }} />
                                <h3 style={{ fontSize: 20, marginBottom: 8 }}>Hospital Check-in</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                                    Enter the 8-character code from the admin desk.
                                </p>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={checkInCode}
                                    onChange={e => setCheckInCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. A1B2C3D4"
                                    maxLength={8}
                                    autoFocus
                                    style={{ letterSpacing: 4, textAlign: 'center', fontWeight: 700, fontSize: 18 }}
                                />
                                {checkInError && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: '#ef4444', fontSize: 13 }}>
                                        <AlertCircle size={16} /> {checkInError}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setCheckInVisitId(null)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                                        {submitting ? 'Verifying...' : 'Check in'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
