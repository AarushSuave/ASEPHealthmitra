import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { Camera, Edit3, Save, LogOut, FileText, Activity, Shield, Heart, AlertTriangle, Droplets, Users, UserPlus, Trash2 } from 'lucide-react'
import { getHealthSync } from '../utils/healthSync'

export default function Profile() {
    const { user, token, logout, updateProfile, uploadPhoto, fetchProfile } = useAuth()
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({})
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')
    const [familyMembers, setFamilyMembers] = useState([])
    const [familyEmail, setFamilyEmail] = useState('')
    const [familyRelation, setFamilyRelation] = useState('')
    const [familyLoading, setFamilyLoading] = useState(false)
    const photoRef = useRef()

    const loadFamily = async () => {
        if (!token) return
        try {
            const res = await fetch('/api/family/members', { headers: { Authorization: `Bearer ${token}` } })
            if (res.ok) {
                const data = await res.json()
                setFamilyMembers(data.members || [])
            }
        } catch {
            /* ignore */
        }
    }

    useEffect(() => {
        loadFamily()
    }, [token])

    const linkFamily = async (e) => {
        e.preventDefault()
        if (!familyEmail.trim() || !familyRelation) return
        setFamilyLoading(true)
        try {
            const res = await fetch('/api/family/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ email: familyEmail.trim(), relation: familyRelation }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Could not link family member')
            setFamilyEmail('')
            setMsg(data.message || 'Family member linked!')
            await loadFamily()
            setTimeout(() => setMsg(''), 4000)
        } catch (err) {
            setMsg(err.message)
            setTimeout(() => setMsg(''), 5000)
        }
        setFamilyLoading(false)
    }

    const unlinkFamily = async (linkedUserId) => {
        if (!window.confirm('Remove this family link?')) return
        await fetch(`/api/family/link/${linkedUserId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        })
        await loadFamily()
        setMsg('Family member removed')
        setTimeout(() => setMsg(''), 3000)
    }

    if (!user) return null

    const startEdit = () => {
        setForm({
            name: user.name || '',
            phone: user.phone || '',
            age: user.age || '',
            gender: user.gender || '',
            blood_group: user.blood_group || '',
            village: user.village || '',
            medical_conditions: (user.medical_conditions || []).join(', '),
            allergies: (user.allergies || []).join(', '),
            emergency_contact: user.emergency_contact || '',
        })
        setEditing(true)
    }

    const handleSave = async () => {
        setSaving(true)
        const fields = {
            ...form,
            medical_conditions: JSON.stringify(form.medical_conditions.split(',').map(s => s.trim()).filter(Boolean)),
            allergies: JSON.stringify(form.allergies.split(',').map(s => s.trim()).filter(Boolean)),
        }
        await updateProfile(fields)
        await fetchProfile()
        setEditing(false)
        setSaving(false)
        setMsg('Profile updated!')
        setTimeout(() => setMsg(''), 3000)
    }

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        await uploadPhoto(file)
        await fetchProfile()
        setMsg('Photo updated!')
        setTimeout(() => setMsg(''), 3000)
    }

    const stats = user.health_stats || {}
    const sync = user?.id ? getHealthSync(user.id) : {}
    const diabetesRisk = stats.diabetes_risk ?? sync.risk?.diabetes_risk
    const heartRisk = stats.heart_risk ?? sync.risk?.heart_risk
    const combinedRisk = stats.combined_risk ?? sync.risk?.combined_risk ?? stats.latest_risk_score
    const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'

    return (
        <div>
            <div className="page-header">
                <h2>👤 My Health Profile</h2>
                <p>Your personal health dashboard and AI Health Twin</p>
            </div>

            {msg && <div style={{ padding: '10px 16px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, marginBottom: 16, color: '#10b981', fontSize: 13, fontWeight: 600 }}>{msg}</div>}

            <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Profile Card */}
                <div className="glass-card animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div className="profile-photo-wrapper" onClick={() => photoRef.current?.click()}>
                        <input ref={photoRef} type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
                        {user.profile_photo ? (
                            <img src={user.profile_photo} alt={user.name} className="profile-photo-lg" />
                        ) : (
                            <div className="profile-avatar-lg">{initials}</div>
                        )}
                        <div className="profile-photo-overlay"><Camera size={20} /></div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ fontSize: 20, fontWeight: 700 }}>{user.name}</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</p>
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {user.age && <span className="profile-tag">🎂 {user.age} yrs</span>}
                        {user.gender && <span className="profile-tag">👤 {user.gender}</span>}
                        {user.blood_group && <span className="profile-tag blood">🩸 {user.blood_group}</span>}
                        {user.phone && <span className="profile-tag">📱 {user.phone}</span>}
                        {user.village && <span className="profile-tag">📍 {user.village}</span>}
                    </div>

                    {(user.medical_conditions?.length > 0 || user.allergies?.length > 0) && (
                        <div style={{ width: '100%', borderTop: '1px solid var(--border-glass)', paddingTop: 16 }}>
                            {user.medical_conditions?.length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CONDITIONS:</span>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                        {user.medical_conditions.map((c, i) => <span key={i} className="profile-tag condition">{c}</span>)}
                                    </div>
                                </div>
                            )}
                            {user.allergies?.length > 0 && (
                                <div>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>ALLERGIES:</span>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                        {user.allergies.map((a, i) => <span key={i} className="profile-tag allergy">⚠️ {a}</span>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {!editing ? (
                            <button className="btn btn-outline" onClick={startEdit}>
                                <Edit3 size={14} /> Edit Profile
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                            </button>
                        )}
                        <button className="btn btn-outline" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={logout}>
                            <LogOut size={14} /> Logout
                        </button>
                    </div>
                </div>

                {/* Health Stats / AI Health Twin */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="glass-card animate-in glow-teal">
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Heart size={18} style={{ color: '#ef4444' }} /> AI Health Twin
                        </h3>

                        <div className="grid-2" style={{ gap: 12 }}>
                            {[
                                { icon: FileText, label: 'Reports Scanned', value: stats.total_reports || 0, color: '#06b6d4' },
                                { icon: Droplets, label: 'Diabetes Risk', value: diabetesRisk != null ? `${Math.round(diabetesRisk)}%` : 'N/A', color: (diabetesRisk ?? 0) >= 60 ? '#ef4444' : (diabetesRisk ?? 0) >= 30 ? '#f59e0b' : '#10b981' },
                                { icon: Heart, label: 'Heart Risk', value: heartRisk != null ? `${Math.round(heartRisk)}%` : 'N/A', color: (heartRisk ?? 0) >= 60 ? '#ef4444' : (heartRisk ?? 0) >= 30 ? '#f59e0b' : '#10b981' },
                                { icon: Activity, label: 'Combined Risk', value: combinedRisk != null ? `${Math.round(combinedRisk)}%` : 'N/A', color: (combinedRisk ?? 0) >= 60 ? '#ef4444' : (combinedRisk ?? 0) >= 30 ? '#f59e0b' : '#10b981' },
                            ].map((s, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: `${s.color}10`, borderRadius: 12, border: `1px solid ${s.color}20` }}>
                                    <s.icon size={20} style={{ color: s.color, flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {(stats.latest_report_filename || sync.latestReport?.filename) && (
                            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                                Latest scan: {stats.latest_report_filename || sync.latestReport?.filename}
                            </div>
                        )}
                        {(stats.latest_risk_level || combinedRisk != null) && (
                            <div style={{
                                marginTop: 16, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                                background: (combinedRisk ?? 0) >= 60 ? 'rgba(239,68,68,0.1)' : (combinedRisk ?? 0) >= 30 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                color: (combinedRisk ?? 0) >= 60 ? '#ef4444' : (combinedRisk ?? 0) >= 30 ? '#f59e0b' : '#10b981',
                                display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                {(combinedRisk ?? 0) >= 60 ? <AlertTriangle size={16} /> : <Shield size={16} />}
                                Synced risk: {combinedRisk != null ? `${Math.round(combinedRisk)}%` : stats.latest_risk_level?.toUpperCase()}
                            </div>
                        )}
                    </div>

                    {user.emergency_contact && (
                        <div className="glass-card animate-in" style={{ borderLeft: '3px solid #ef4444' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>🚨 EMERGENCY CONTACT</div>
                            <div style={{ fontSize: 15, fontWeight: 600 }}>{user.emergency_contact}</div>
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-card animate-in" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={18} color="#06b6d4" /> Family Members / परिवार
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Link relatives who also have a HealthMitra account using their signup email. Linked profiles appear in OurHealth for ASHA workers.
                </p>

                <form onSubmit={linkFamily} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    <input
                        className="form-input"
                        type="email"
                        placeholder="Family member's email"
                        value={familyEmail}
                        onChange={(e) => setFamilyEmail(e.target.value)}
                        style={{ flex: '1 1 200px' }}
                    />
                    <select
                        className="form-select"
                        value={familyRelation}
                        onChange={(e) => setFamilyRelation(e.target.value)}
                        style={{ minWidth: 140 }}
                        required
                    >
                        <option value="" disabled>Select relationship</option>
                        <option value="spouse">Spouse</option>
                        <option value="parent">Parent</option>
                        <option value="child">Child</option>
                        <option value="sibling">Sibling</option>
                    </select>
                    <button type="submit" className="btn btn-primary" disabled={familyLoading || !familyRelation}>
                        <UserPlus size={14} /> {familyLoading ? 'Linking…' : 'Link'}
                    </button>
                </form>

                {familyMembers.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No family members linked yet.</div>
                ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                        {familyMembers.map((m) => (
                            <div key={m.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                                padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {m.email} • {m.relation} • {m.village || 'No village'}
                                    </div>
                                    {m.phone && <div style={{ fontSize: 12, marginTop: 4 }}>📞 {m.phone}</div>}
                                    {m.medical_conditions?.length > 0 && (
                                        <div style={{ fontSize: 11, marginTop: 4, color: '#f59e0b' }}>
                                            {m.medical_conditions.join(', ')}
                                        </div>
                                    )}
                                </div>
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => unlinkFamily(m.id)} style={{ color: '#ef4444' }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Form */}
            {editing && (
                <div className="glass-card animate-in" style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>✏️ Edit Profile</h3>
                    <div className="grid-2" style={{ gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Age</label>
                            <input type="number" className="form-input" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Gender</label>
                            <select className="form-select" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Blood Group</label>
                            <select className="form-select" value={form.blood_group} onChange={e => setForm(p => ({ ...p, blood_group: e.target.value }))}>
                                <option value="">Select</option>
                                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Village</label>
                            <input className="form-input" value={form.village} onChange={e => setForm(p => ({ ...p, village: e.target.value }))} placeholder="Your village name" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Emergency Contact</label>
                            <input className="form-input" value={form.emergency_contact} onChange={e => setForm(p => ({ ...p, emergency_contact: e.target.value }))} placeholder="Name - Phone" />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Medical Conditions (comma-separated)</label>
                            <input className="form-input" value={form.medical_conditions} onChange={e => setForm(p => ({ ...p, medical_conditions: e.target.value }))} placeholder="e.g., Diabetes, Hypertension" />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Allergies (comma-separated)</label>
                            <input className="form-input" value={form.allergies} onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))} placeholder="e.g., Peanuts, Penicillin" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
