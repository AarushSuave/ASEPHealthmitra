import { useEffect, useMemo, useState } from 'react'
import {
    AlertTriangle,
    CalendarDays,
    Home,
    MapPin,
    Megaphone,
    Phone,
    Plus,
    Route,
    Search,
    ShieldAlert,
    TrendingDown,
    TrendingUp,
    UserPlus,
    Users,
    History,
    LogOut,
    RefreshCw
} from 'lucide-react'
import { useAuth } from '../AuthContext'

const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'map', label: 'Cluster Map', icon: MapPin },
    { id: 'visits', label: 'Visit Planner', icon: CalendarDays },
    { id: 'outreach', label: 'Outreach', icon: Megaphone },
]

const riskColor = (risk) => risk >= 60 ? '#ef4444' : risk >= 30 ? '#f59e0b' : '#10b981'
const riskLabel = (risk) => risk >= 60 ? 'At Risk' : risk >= 30 ? 'Medium' : 'Low'

const sparklinePoints = (values) => {
    const min = Math.min(...values)
    const max = Math.max(...values)
    return values.map((value, index) => {
        const x = (index / (values.length - 1 || 1)) * 100
        const y = max === min ? 50 : ((max - value) / (max - min)) * 100
        return `${x},${y}`
    }).join(' ')
}

/** Spread village markers on the map so clusters never overlap. */
function layoutVillagePositions(villageNames) {
    const names = [...villageNames].sort((a, b) => a.localeCompare(b))
    const n = names.length
    if (n === 0) return {}

    const layout = {}
    const cx = 50
    const cy = 48
    const radius = Math.min(34, 14 + n * 2.8)

    names.forEach((name, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2
        layout[name] = {
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius * 0.82,
        }
    })

    const minDist = 13
    for (let pass = 0; pass < 12; pass++) {
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const a = names[i]
                const b = names[j]
                const dx = layout[b].x - layout[a].x
                const dy = layout[b].y - layout[a].y
                const dist = Math.hypot(dx, dy) || 0.01
                if (dist < minDist) {
                    const push = (minDist - dist) / 2
                    layout[a].x -= (dx / dist) * push
                    layout[a].y -= (dy / dist) * push
                    layout[b].x += (dx / dist) * push
                    layout[b].y += (dy / dist) * push
                }
            }
        }
        names.forEach((name) => {
            layout[name].x = Math.max(14, Math.min(86, layout[name].x))
            layout[name].y = Math.max(14, Math.min(86, layout[name].y))
        })
    }
    return layout
}

export default function RuralMode() {
    const { logout, token } = useAuth()
    const [patients, setPatients] = useState([])
    const [villages, setVillages] = useState({})
    const [extraVillages, setExtraVillages] = useState({})
    const [visitQueue, setVisitQueue] = useState([])
    const [loading, setLoading] = useState(true)
    const [syncError, setSyncError] = useState('')
    const [activeTab, setActiveTab] = useState('overview')
    const [search, setSearch] = useState('')
    const [selectedVillage, setSelectedVillage] = useState('All Villages')
    const [riskFilter, setRiskFilter] = useState('all')
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [showAdd, setShowAdd] = useState(false)
    const [newPatient, setNewPatient] = useState({ name: '', age: '', gender: 'Female', blood_group: '', village: '', phone: '', householdId: '' })
    const [newVillageName, setNewVillageName] = useState('')

    const mergedVillages = useMemo(() => ({ ...villages, ...extraVillages }), [villages, extraVillages])

    const loadDashboard = async () => {
        if (!token) return
        setLoading(true)
        setSyncError('')
        try {
            const res = await fetch('/api/ourhealth/dashboard', {
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Could not sync OurHealth data')
            setPatients(data.patients || [])
            setVillages(data.villages || {})
            setVisitQueue(data.visits || [])
        } catch (err) {
            setSyncError(err.message)
        }
        setLoading(false)
    }

    useEffect(() => {
        localStorage.removeItem('hm_asha_patients')
        localStorage.removeItem('hm_asha_villages')
        loadDashboard()
    }, [token])

    const villageOptions = useMemo(() => ['All Villages', ...Object.keys(mergedVillages)], [mergedVillages])

    const villageClusters = useMemo(() => {
        const names = Object.keys(mergedVillages)
        const positions = layoutVillagePositions(names)
        return names.map((village) => {
            const rows = patients.filter((patient) => patient.village === village)
            const highRisk = rows.filter((patient) => patient.risk >= 60).length
            const pendingReports = rows.reduce((sum, patient) => sum + patient.pendingReports, 0)
            const avgRisk = rows.length ? Math.round(rows.reduce((sum, patient) => sum + patient.risk, 0) / rows.length) : 0
            return {
                village,
                count: rows.length,
                highRisk,
                pendingReports,
                avgRisk,
                x: positions[village].x,
                y: positions[village].y,
            }
        })
    }, [patients, mergedVillages])

    const filteredPatients = useMemo(() => patients.filter((patient) => {
        const query = search.trim().toLowerCase()
        const matchesSearch = !query || `${patient.name} ${patient.village} ${patient.phone} ${patient.householdId}`.toLowerCase().includes(query)
        const matchesVillage = selectedVillage === 'All Villages' || patient.village === selectedVillage
        const matchesRisk = riskFilter === 'all'
            || (riskFilter === 'high' && patient.risk >= 60)
            || (riskFilter === 'medium' && patient.risk >= 30 && patient.risk < 60)
            || (riskFilter === 'low' && patient.risk < 30)
        return matchesSearch && matchesVillage && matchesRisk
    }), [patients, search, selectedVillage, riskFilter])

    const urgentAlerts = useMemo(() => patients.filter((patient) => patient.risk >= 60 || (patient.flags && patient.flags.length > 0)), [patients])
    const selectedCluster = villageClusters.find((cluster) => cluster.village === selectedVillage)

    const stats = [
        { label: 'Patients', value: patients.length, color: '#06b6d4', onClick: () => setActiveTab('patients') },
        { label: 'Villages', value: villageClusters.filter((cluster) => cluster.count > 0).length, color: '#10b981', onClick: () => setActiveTab('map') },
        { label: 'High Risk', value: urgentAlerts.length, color: '#ef4444', onClick: () => { setRiskFilter('high'); setActiveTab('patients') } },
        { label: 'Visits Due', value: visitQueue.filter((patient) => patient.followupStatus === 'overdue').length, color: '#f59e0b', onClick: () => setActiveTab('visits') },
    ]

    const updateNewPatient = (key, value) => setNewPatient((prev) => ({ ...prev, [key]: value }))

    const addPatient = async () => {
        if (!newPatient.name || !newPatient.village) return
        try {
            const res = await fetch('/api/ourhealth/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: newPatient.name,
                    age: Number(newPatient.age || 0) || null,
                    gender: newPatient.gender,
                    blood_group: newPatient.blood_group || null,
                    village: newPatient.village,
                    phone: newPatient.phone || null,
                }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || 'Failed to add patient')
            }
            await loadDashboard()
            setNewPatient({ name: '', age: '', gender: 'Female', blood_group: '', village: '', phone: '', householdId: '' })
            setShowAdd(false)
            setSelectedVillage(newPatient.village)
            setActiveTab('patients')
        } catch (err) {
            setSyncError(err.message)
        }
    }

    const addNewVillage = () => {
        const name = newVillageName.trim()
        if (!name || mergedVillages[name]) return
        const x = Math.floor(Math.random() * 80) + 10
        const y = Math.floor(Math.random() * 80) + 10
        setExtraVillages((prev) => ({ ...prev, [name]: { x, y } }))
        setNewVillageName('')
        setSelectedVillage(name)
        setActiveTab('map')
    }

    const scheduleVisit = async (patientId, date) => {
        if (!patientId || !date) return
        try {
            const res = await fetch('/api/ourhealth/visits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    patient_id: patientId,
                    visit_date: new Date(date).toISOString(),
                    purpose: 'ASHA follow-up',
                }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || 'Failed to schedule visit')
            }
            await loadDashboard()
        } catch (err) {
            setSyncError(err.message)
        }
    }

    const selectCluster = (village) => {
        setSelectedVillage((prev) => prev === village ? 'All Villages' : village)
        setActiveTab('map')
    }

    const resetFilters = () => {
        setSearch('')
        setSelectedVillage('All Villages')
        setRiskFilter('all')
    }

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>OurHealth Mode</h2>
                    <p>Village-first workflow for patient registry, cluster mapping, visit planning, and outreach.</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={loadDashboard} disabled={loading}>
                        <RefreshCw size={16} /> Sync
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={logout}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </div>

            {syncError && (
                <div className="glass-card" style={{ marginBottom: 12, borderLeft: '3px solid #ef4444', color: '#ef4444', fontSize: 13 }}>
                    {syncError}
                </div>
            )}

            {loading && (
                <div className="glass-card" style={{ marginBottom: 12, opacity: 0.8 }}>Syncing patients from database…</div>
            )}

            <div className="glass-card animate-in" style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'patients' ? 'minmax(220px, 1fr) auto' : 'auto', gap: 12, alignItems: 'center' }}>
                    {activeTab === 'patients' && (
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                            <input
                                className="form-input"
                                placeholder="Search name, village, phone, household..."
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                style={{ paddingLeft: 36 }}
                            />
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <select className="form-select" value={selectedVillage} onChange={(event) => setSelectedVillage(event.target.value)}>
                            {villageOptions.map((village) => <option key={village}>{village}</option>)}
                        </select>
                        <select className="form-select" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
                            <option value="all">All Risk</option>
                            <option value="high">High Risk</option>
                            <option value="medium">Medium Risk</option>
                            <option value="low">Low Risk</option>
                        </select>
                        <button className="btn btn-outline" onClick={resetFilters}>Reset</button>
                        <button className="btn btn-primary" onClick={() => setShowAdd((prev) => !prev)}>
                            <UserPlus size={16} /> Add Patient
                        </button>
                    </div>
                </div>
            </div>

            <div className="animate-in" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                        <button key={tab.id} className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab(tab.id)}>
                            <Icon size={14} /> {tab.label}
                        </button>
                    )
                })}
            </div>

            {showAdd && (
                <div className="glass-card animate-in" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 12 }}>Add Patient To OurHealth</h3>
                    <div className="grid-3" style={{ gap: 12 }}>
                        <input className="form-input" placeholder="Full name" value={newPatient.name} onChange={(event) => updateNewPatient('name', event.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') addPatient() }} />
                        <input className="form-input" type="number" placeholder="Age" value={newPatient.age} onChange={(event) => updateNewPatient('age', event.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') addPatient() }} />
                        <select className="form-select" value={newPatient.gender} onChange={(event) => updateNewPatient('gender', event.target.value)}>
                            <option>Female</option>
                            <option>Male</option>
                            <option>Other</option>
                        </select>
                        <input className="form-input" placeholder="Blood group" value={newPatient.blood_group} onChange={(event) => updateNewPatient('blood_group', event.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') addPatient() }} />
                        <select className="form-select" value={newPatient.village} onChange={(event) => updateNewPatient('village', event.target.value)}>
                            <option value="">Village</option>
                            {Object.keys(mergedVillages).map((village) => <option key={village}>{village}</option>)}
                        </select>
                        <input className="form-input" placeholder="Phone" value={newPatient.phone} onChange={(event) => updateNewPatient('phone', event.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') addPatient() }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="btn btn-primary" onClick={addPatient}><Plus size={16} /> Save Patient</button>
                        <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {activeTab === 'overview' && (
                <>
                    <div className="grid-4 animate-in" style={{ marginBottom: 16 }}>
                        {stats.map((stat) => (
                            <button key={stat.label} className="glass-card stat-card" style={{ textAlign: 'left' }} onClick={stat.onClick}>
                                <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                                <div className="stat-label">{stat.label}</div>
                            </button>
                        ))}
                    </div>
                    <div className="grid-2 animate-in">
                        <AlertsPanel alerts={urgentAlerts} onSelect={setSelectedPatient} />
                        <VisitPanel visits={visitQueue.slice(0, 5)} patients={patients} onSchedule={scheduleVisit} />
                    </div>
                </>
            )}

            {activeTab === 'patients' && (
                <PatientGrid patients={filteredPatients} onSelect={setSelectedPatient} />
            )}

            {activeTab === 'map' && (
                <div className="grid-2 animate-in">
                    <div>
                        <ClusterMap clusters={villageClusters} selectedVillage={selectedVillage} onSelect={selectCluster} />
                        <div className="glass-card" style={{ marginTop: 16 }}>
                            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Add New Village</h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="form-input" placeholder="Village name..." value={newVillageName} onChange={(e) => setNewVillageName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNewVillage() }} />
                                <button className="btn btn-primary" onClick={addNewVillage}><Plus size={16} /> Add</button>
                            </div>
                        </div>
                    </div>
                    <ClusterDetails cluster={selectedCluster} patients={filteredPatients} onSelectPatient={setSelectedPatient} />
                </div>
            )}

            {activeTab === 'visits' && (
                <VisitPanel visits={visitQueue} patients={patients} onSchedule={scheduleVisit} expanded />
            )}

            {activeTab === 'outreach' && (
                <OutreachPanel patients={patients} alerts={urgentAlerts} visits={visitQueue} />
            )}

            {selectedPatient && (
                <PatientModal
                    patient={selectedPatient}
                    family={patients.filter((patient) =>
                        patient.householdId === selectedPatient.householdId
                        || selectedPatient.family_members?.some((f) => f.id === patient.id)
                    )}
                    onClose={() => setSelectedPatient(null)}
                    onSchedule={scheduleVisit}
                />
            )}
        </div>
    )
}

function PatientGrid({ patients, onSelect }) {
    if (!patients.length) {
        return <div className="glass-card">No patients match the current filters.</div>
    }
    return (
        <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {patients.map((patient) => {
                const delta = patient.riskHistory[patient.riskHistory.length - 1] - patient.riskHistory[0]
                return (
                    <button key={patient.id} className="glass-card" onClick={() => onSelect(patient)} style={{ textAlign: 'left', border: `1px solid ${riskColor(patient.risk)}66` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{patient.name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{patient.village} | {patient.age}/{String(patient.gender || '?')[0]} | {patient.blood_group || '—'}</div>
                            </div>
                            <div style={{ color: riskColor(patient.risk), fontWeight: 800 }}>{patient.risk}%</div>
                        </div>
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 42, marginTop: 12 }}>
                            <polyline fill="none" stroke={riskColor(patient.risk)} strokeWidth="4" points={sparklinePoints(patient.riskHistory)} />
                        </svg>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, color: 'var(--text-muted)', fontSize: 12 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {delta >= 0 ? <TrendingUp size={13} color="#ef4444" /> : <TrendingDown size={13} color="#10b981" />}
                                Trend {delta >= 0 ? '+' : ''}{delta}
                            </span>
                            <span style={{ color: patient.risk >= 60 ? '#ef4444' : undefined }}>{riskLabel(patient.risk)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                            {patient.pendingReports > 0 && <span className="sidebar-badge">Report pending</span>}
                            {patient.followupStatus === 'overdue' && <span className="sidebar-badge" style={{ background: 'rgba(239,68,68,0.16)', color: '#ef4444' }}>Overdue</span>}
                        </div>
                    </button>
                )
            })}
        </div>
    )
}

function ClusterMap({ clusters, selectedVillage, onSelect }) {
    if (!clusters.length) {
        return (
            <div className="glass-card">
                <h3 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={18} color="#06b6d4" /> Village Cluster Map
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No villages yet. Add patients with a village name, then Sync.</p>
            </div>
        )
    }

    const hubX = clusters.reduce((s, c) => s + c.x, 0) / clusters.length
    const hubY = clusters.reduce((s, c) => s + c.y, 0) / clusters.length
    const sorted = [...clusters].sort((a, b) => a.village.localeCompare(b.village))

    return (
        <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={18} color="#06b6d4" /> Village Cluster Map
                </h3>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(6,182,212,0.5)' }} /> Stable cluster
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(239,68,68,0.55)' }} /> At-risk cluster
                    </span>
                </div>
            </div>

            <svg
                viewBox="0 0 100 100"
                role="img"
                aria-label="Village cluster map"
                style={{
                    width: '100%',
                    height: 'auto',
                    aspectRatio: '4 / 3',
                    borderRadius: 12,
                    background: 'linear-gradient(160deg, rgba(6,182,212,0.1) 0%, rgba(15,23,42,0.4) 50%, rgba(16,185,129,0.08) 100%)',
                    border: '1px solid var(--border-glass)',
                }}
            >
                {sorted.map((cluster) => (
                    <line
                        key={`link-${cluster.village}`}
                        x1={hubX}
                        y1={hubY}
                        x2={cluster.x}
                        y2={cluster.y}
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="0.35"
                        strokeDasharray="1.2 1.2"
                    />
                ))}
                <circle cx={hubX} cy={hubY} r="1.2" fill="rgba(255,255,255,0.15)" />

                {sorted.map((cluster) => {
                    const selected = selectedVillage === cluster.village
                    const atRisk = cluster.highRisk > 0 || cluster.avgRisk >= 60
                    const r = 3.2 + Math.min(cluster.count * 0.55, 4)
                    const fill = atRisk ? 'rgba(239,68,68,0.55)' : 'rgba(6,182,212,0.45)'
                    const stroke = selected ? '#22d3ee' : 'rgba(255,255,255,0.35)'

                    return (
                        <g
                            key={cluster.village}
                            style={{ cursor: 'pointer' }}
                            onClick={() => onSelect(cluster.village)}
                            onKeyDown={(e) => e.key === 'Enter' && onSelect(cluster.village)}
                            tabIndex={0}
                            role="button"
                            aria-label={`${cluster.village}, ${cluster.count} patients`}
                        >
                            {selected && (
                                <circle cx={cluster.x} cy={cluster.y} r={r + 2.2} fill="none" stroke="#22d3ee" strokeWidth="0.5" opacity="0.85" />
                            )}
                            <circle cx={cluster.x} cy={cluster.y} r={r} fill={fill} stroke={stroke} strokeWidth={selected ? 0.55 : 0.3} />
                            <text
                                x={cluster.x}
                                y={cluster.y + 0.35}
                                textAnchor="middle"
                                fontSize="3.2"
                                fontWeight="700"
                                fill="#f8fafc"
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                                {cluster.count}
                            </text>
                            {(selected || cluster.count > 0) && (
                                <text
                                    x={cluster.x}
                                    y={cluster.y + r + 3.8}
                                    textAnchor="middle"
                                    fontSize="2.4"
                                    fill={selected ? '#67e8f9' : 'rgba(226,232,240,0.75)'}
                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                >
                                    {cluster.village.length > 14 ? `${cluster.village.slice(0, 12)}…` : cluster.village}
                                </text>
                            )}
                        </g>
                    )
                })}
            </svg>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {sorted.map((cluster) => (
                    <button
                        key={cluster.village}
                        type="button"
                        className={`btn btn-sm ${selectedVillage === cluster.village ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => onSelect(cluster.village)}
                        style={{ minWidth: 0 }}
                    >
                        {cluster.village} ({cluster.count})
                        {cluster.highRisk > 0 && (
                            <span style={{ marginLeft: 6, color: '#ef4444', fontSize: 10 }}>• {cluster.highRisk} at risk</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}

function ClusterDetails({ cluster, patients, onSelectPatient }) {
    if (!cluster) {
        return (
            <div className="glass-card">
                <h3 style={{ fontSize: 16, marginBottom: 12 }}>All Village Worklist</h3>
                <PatientMiniList patients={patients.slice(0, 8)} onSelect={onSelectPatient} />
            </div>
        )
    }
    return (
        <div className="glass-card">
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>{cluster.village} Worklist</h3>
            <div className="grid-3" style={{ gap: 10, marginBottom: 12 }}>
                <MiniMetric label="Patients" value={cluster.count} />
                <MiniMetric label="High Risk" value={cluster.highRisk} color="#ef4444" />
                <MiniMetric label="Avg Risk" value={`${cluster.avgRisk}%`} color={riskColor(cluster.avgRisk)} />
            </div>
            <PatientMiniList patients={patients} onSelect={onSelectPatient} />
        </div>
    )
}

function AlertsPanel({ alerts, onSelect }) {
    return (
        <div className="glass-card">
            <h3 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={18} color="#ef4444" /> Priority Alerts
            </h3>
            <PatientMiniList patients={alerts} onSelect={onSelect} empty="No urgent cases right now." />
        </div>
    )
}

function VisitPanel({ visits, patients, onSchedule, expanded = false }) {
    if (!visits.length) {
        return (
            <div className="glass-card">
                <h3 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarDays size={18} color="#f59e0b" /> Visit Scheduler
                </h3>
                <div style={{ color: 'var(--text-muted)' }}>No scheduled visits. Patients can book from their app, or schedule below.</div>
                {expanded && patients.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <ScheduleVisitForm patients={patients} onSchedule={onSchedule} />
                    </div>
                )}
            </div>
        )
    }
    return (
        <div className="glass-card">
            <h3 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarDays size={18} color="#f59e0b" /> Visit Scheduler
            </h3>
            <div style={{ display: 'grid', gap: 10 }}>
                {visits.map((visit) => (
                    <div key={visit.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'grid', gridTemplateColumns: expanded ? '1fr auto' : '1fr', gap: 8, alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 700 }}>{visit.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                {visit.village} | {visit.scheduledVisit || visit.scheduledAt?.slice(0, 10)} | {visit.followupStatus}
                            </div>
                            {visit.purpose && <div style={{ fontSize: 12, marginTop: 4 }}>Purpose: {visit.purpose}</div>}
                            {visit.check_in_code && (
                                <div style={{ fontSize: 12, marginTop: 6, fontFamily: 'monospace', color: '#34d399' }}>
                                    Check-in code: <strong>{visit.check_in_code}</strong>
                                </div>
                            )}
                        </div>
                        {expanded && visit.patientId && (
                            <input className="form-input" type="date" defaultValue={visit.scheduledVisit} onChange={(event) => onSchedule(visit.patientId, event.target.value)} title="Reschedule" />
                        )}
                    </div>
                ))}
            </div>
            {expanded && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--border-glass)', paddingTop: 16 }}>
                    <ScheduleVisitForm patients={patients} onSchedule={onSchedule} />
                </div>
            )}
        </div>
    )
}

function ScheduleVisitForm({ patients, onSchedule }) {
    const [patientId, setPatientId] = useState('')
    const [date, setDate] = useState('')
    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <select className="form-select" value={patientId} onChange={(e) => setPatientId(e.target.value)} style={{ minWidth: 160 }}>
                <option value="">Select patient</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.village})</option>)}
            </select>
            <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={!patientId || !date} onClick={() => onSchedule(Number(patientId), date)}>
                Schedule
            </button>
        </div>
    )
}

function OutreachPanel({ patients, alerts, visits }) {
    const overdue = visits.filter((visit) => visit.followupStatus === 'overdue')
    const contactList = patients.length ? patients : alerts
    return (
        <div className="grid-2 animate-in">
            <div className="glass-card">
                <h3 style={{ fontSize: 16, marginBottom: 12 }}>All Patients — Contact List</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                    {contactList.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No patients synced yet. Register users on the patient app or click Sync.</div>}
                    {contactList.map(patient => (
                        <div key={patient.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{patient.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{patient.village} • Risk: {patient.risk}%</div>
                                <div style={{ fontSize: 13, marginTop: 4, fontFamily: 'monospace' }}>
                                    📞 {patient.phone}
                                    {patient.phone_is_sample && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>(sample)</span>}
                                </div>
                                {patient.email && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{patient.email}</div>}
                            </div>
                            <a href={`tel:${patient.phone}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
                                <Phone size={14} /> Call
                            </a>
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-card">
                <h3 style={{ fontSize: 16, marginBottom: 12 }}>Overdue Follow-ups</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                    {overdue.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No overdue follow-ups.</div>}
                    {overdue.map(visit => (
                        <div key={visit.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{visit.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{visit.village} • Due: {visit.scheduledVisit}</div>
                            </div>
                            {visit.patientId && contactList.find(p => p.id === visit.patientId)?.phone && (
                                <a href={`tel:${contactList.find(p => p.id === visit.patientId).phone}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
                                    <Phone size={14} /> Call
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function PatientModal({ patient, family, onClose, onSchedule }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.72)', zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
            <div className="glass-card" style={{ maxWidth: 780, width: '100%', maxHeight: '88vh', overflowY: 'auto' }} onClick={(event) => event.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                    <div>
                        <h3 style={{ fontSize: 20, fontWeight: 800 }}>{patient.name}</h3>
                        <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{patient.village} | Household {patient.householdId}</div>
                        {patient.email && <div style={{ fontSize: 12, marginTop: 4 }}>{patient.email}</div>}
                        <div style={{ fontSize: 13, marginTop: 6, fontFamily: 'monospace' }}>
                            📞 {patient.phone}{patient.phone_is_sample ? ' (sample)' : ''}
                        </div>
                    </div>
                    <div style={{ color: riskColor(patient.risk), fontWeight: 900, fontSize: 24 }}>{patient.risk}%</div>
                </div>
                <div className="grid-3" style={{ gap: 10, marginBottom: 14 }}>
                    <MiniMetric label="Age/Gender" value={`${patient.age}/${String(patient.gender || '?')[0]}`} />
                    <MiniMetric label="Blood Group" value={patient.blood_group || 'N/A'} />
                    <MiniMetric label="Reports" value={patient.report_count} />
                </div>
                {(patient.height_cm || patient.weight_kg) && (
                    <div className="grid-3" style={{ gap: 10, marginBottom: 14 }}>
                        <MiniMetric label="Height" value={patient.height_cm ? `${patient.height_cm} cm` : '—'} />
                        <MiniMetric label="Weight" value={patient.weight_kg ? `${patient.weight_kg} kg` : '—'} />
                        <MiniMetric label="Risk Level" value={riskLabel(patient.risk)} color={riskColor(patient.risk)} />
                    </div>
                )}
                {patient.medical_conditions?.length > 0 && (
                    <div className="glass-card" style={{ padding: 14, marginBottom: 12 }}>
                        <h4 style={{ fontSize: 14, marginBottom: 8 }}>Profile Conditions</h4>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {patient.medical_conditions.map((c, i) => (
                                <span key={i} className="sidebar-badge">{c}</span>
                            ))}
                        </div>
                    </div>
                )}
                <div className="glass-card" style={{ padding: 14, marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, marginBottom: 8 }}>Report Overviews</h4>
                    {patient.reports?.length ? patient.reports.map((r) => (
                        <div key={r.id} style={{ padding: 10, marginBottom: 8, borderRadius: 8, background: 'rgba(255,255,255,0.04)', borderLeft: `3px solid ${riskColor(r.risk_score || 0)}` }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{r.filename}</div>
                            <div style={{ fontSize: 12, color: riskColor(r.risk_score || 0) }}>Risk: {r.risk_score}% ({r.risk_level})</div>
                            {r.summary && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{r.summary}</div>}
                        </div>
                    )) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No medical reports scanned yet.</div>
                    )}
                </div>
                <div className="glass-card" style={{ padding: 14, marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, marginBottom: 8 }}>Appointments</h4>
                    {patient.visits?.length ? patient.visits.map((v) => (
                        <div key={v.id} style={{ fontSize: 13, padding: 8, marginBottom: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                            {v.date?.slice(0, 10)} — {v.purpose} ({v.status})
                            {v.check_in_code && <span style={{ marginLeft: 8, fontFamily: 'monospace', color: '#34d399' }}>Code: {v.check_in_code}</span>}
                        </div>
                    )) : (
                        <div style={{ color: 'var(--text-muted)' }}>No visits scheduled.</div>
                    )}
                </div>
                {patient.family_members?.length > 0 && (
                    <div className="glass-card" style={{ padding: 14, marginBottom: 12 }}>
                        <h4 style={{ fontSize: 14, marginBottom: 8 }}>Linked Family (by email)</h4>
                        {patient.family_members.map((f) => (
                            <div key={f.id} style={{ fontSize: 13, padding: 8, marginBottom: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                                {f.name} ({f.relation}) — {f.email} • {f.phone}
                            </div>
                        ))}
                    </div>
                )}
                <div className="glass-card" style={{ padding: 14, marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, marginBottom: 8 }}>Household</h4>
                    <PatientMiniList patients={family.filter((p) => p.id !== patient.id)} onSelect={() => {}} empty="No linked family members." />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input className="form-input" type="date" defaultValue={patient.scheduledVisit} onChange={(event) => onSchedule(patient.id, event.target.value)} style={{ maxWidth: 180 }} />
                    <a href={`tel:${patient.phone}`} className="btn btn-outline" style={{ textDecoration: 'none' }}><Phone size={14} /> Call</a>
                    <button className="btn btn-primary" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    )
}

function PatientMiniList({ patients, onSelect, empty = 'No patients to show.' }) {
    if (!patients.length) return <div style={{ color: 'var(--text-muted)' }}>{empty}</div>
    return (
        <div style={{ display: 'grid', gap: 8 }}>
            {patients.map((patient) => (
                <button key={patient.id} onClick={() => onSelect(patient)} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.04)', color: 'inherit', textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span>{patient.name}<span style={{ color: 'var(--text-muted)' }}> | {patient.village}</span></span>
                    <span style={{ color: riskColor(patient.risk), fontWeight: 800 }}>{patient.risk}%</span>
                </button>
            ))}
        </div>
    )
}

function MiniMetric({ label, value, color = 'var(--text-primary)' }) {
    return (
        <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
        </div>
    )
}
