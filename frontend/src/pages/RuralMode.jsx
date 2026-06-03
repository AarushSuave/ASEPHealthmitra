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
    LogOut
} from 'lucide-react'
import { useAuth } from '../AuthContext'

const initialPatients = [
    {
        id: 1, name: 'Ramesh Kumar', age: 45, gender: 'Male', blood_group: 'B+', village: 'Chandpur', phone: '9876543210',
        report_count: 3, risk: 78, riskHistory: [52, 58, 63, 70, 78], lastVisit: '2026-04-26', scheduledVisit: '2026-05-02',
        householdId: 'HH-CH-101', pendingReports: 1, followupStatus: 'overdue', flags: ['pneumonia']
    },
    {
        id: 2, name: 'Sunita Devi', age: 38, gender: 'Female', blood_group: 'O+', village: 'Chandpur', phone: '9988776655',
        report_count: 2, risk: 35, riskHistory: [42, 39, 37, 33, 35], lastVisit: '2026-04-22', scheduledVisit: '2026-05-03',
        householdId: 'HH-CH-101', pendingReports: 0, followupStatus: 'scheduled', flags: []
    },
    {
        id: 3, name: 'Mohan Lal', age: 62, gender: 'Male', blood_group: 'A+', village: 'Ramgarh', phone: '9123456701',
        report_count: 5, risk: 65, riskHistory: [54, 57, 60, 63, 65], lastVisit: '2026-04-18', scheduledVisit: '2026-04-25',
        householdId: 'HH-RG-122', pendingReports: 2, followupStatus: 'overdue', flags: ['fracture']
    },
    {
        id: 4, name: 'Geeta Bai', age: 55, gender: 'Female', blood_group: 'B-', village: 'Ramgarh', phone: '9765432111',
        report_count: 1, risk: 42, riskHistory: [44, 43, 41, 40, 42], lastVisit: '2026-04-27', scheduledVisit: '2026-05-01',
        householdId: 'HH-RG-122', pendingReports: 0, followupStatus: 'scheduled', flags: []
    },
    {
        id: 5, name: 'Raju Singh', age: 28, gender: 'Male', blood_group: 'AB+', village: 'Devpur', phone: '9345678910',
        report_count: 1, risk: 15, riskHistory: [26, 22, 20, 17, 15], lastVisit: '2026-04-24', scheduledVisit: '2026-05-05',
        householdId: 'HH-DP-144', pendingReports: 0, followupStatus: 'scheduled', flags: []
    },
    {
        id: 6, name: 'Parvati Meena', age: 67, gender: 'Female', blood_group: 'O-', village: 'Bhavanpur', phone: '9012345678',
        report_count: 4, risk: 72, riskHistory: [61, 64, 67, 69, 72], lastVisit: '2026-04-20', scheduledVisit: '2026-05-01',
        householdId: 'HH-BP-211', pendingReports: 1, followupStatus: 'overdue', flags: ['low oxygen']
    },
    {
        id: 7, name: 'Amit Rawat', age: 33, gender: 'Male', blood_group: 'A-', village: 'Nandgaon', phone: '9234567891',
        report_count: 0, risk: 24, riskHistory: [20, 22, 22, 23, 24], lastVisit: '2026-04-25', scheduledVisit: '2026-05-06',
        householdId: 'HH-NG-309', pendingReports: 0, followupStatus: 'scheduled', flags: []
    },
]

const initialVillageCoords = {
    Chandpur: { x: 28, y: 34 },
    Ramgarh: { x: 62, y: 28 },
    Devpur: { x: 48, y: 68 },
    Bhavanpur: { x: 76, y: 62 },
    Nandgaon: { x: 20, y: 72 },
}

const STORAGE_PATIENTS = 'hm_asha_patients'
const STORAGE_VILLAGES = 'hm_asha_villages'

const loadStored = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : fallback
    } catch {
        return fallback
    }
}

const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'map', label: 'Cluster Map', icon: MapPin },
    { id: 'visits', label: 'Visit Planner', icon: CalendarDays },
    { id: 'outreach', label: 'Outreach', icon: Megaphone },
]

const riskColor = (risk) => risk >= 60 ? '#ef4444' : risk >= 30 ? '#f59e0b' : '#10b981'
const riskLabel = (risk) => risk >= 60 ? 'High' : risk >= 30 ? 'Medium' : 'Low'

const sparklinePoints = (values) => {
    const min = Math.min(...values)
    const max = Math.max(...values)
    return values.map((value, index) => {
        const x = (index / (values.length - 1 || 1)) * 100
        const y = max === min ? 50 : ((max - value) / (max - min)) * 100
        return `${x},${y}`
    }).join(' ')
}

export default function RuralMode() {
    const { logout } = useAuth()
    const [patients, setPatients] = useState(() => loadStored(STORAGE_PATIENTS, initialPatients))
    const [villages, setVillages] = useState(() => loadStored(STORAGE_VILLAGES, initialVillageCoords))
    const [activeTab, setActiveTab] = useState('overview')
    const [search, setSearch] = useState('')
    const [selectedVillage, setSelectedVillage] = useState('All Villages')
    const [riskFilter, setRiskFilter] = useState('all')
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [showAdd, setShowAdd] = useState(false)
    const [newPatient, setNewPatient] = useState({ name: '', age: '', gender: 'Female', blood_group: '', village: '', phone: '', householdId: '' })
    const [newVillageName, setNewVillageName] = useState('')

    useEffect(() => {
        localStorage.setItem(STORAGE_PATIENTS, JSON.stringify(patients))
    }, [patients])

    useEffect(() => {
        localStorage.setItem(STORAGE_VILLAGES, JSON.stringify(villages))
    }, [villages])

    const villageOptions = useMemo(() => ['All Villages', ...Object.keys(villages)], [villages])

    const villageClusters = useMemo(() => Object.keys(villages).map((village) => {
        const rows = patients.filter((patient) => patient.village === village)
        const highRisk = rows.filter((patient) => patient.risk >= 60).length
        const pendingReports = rows.reduce((sum, patient) => sum + patient.pendingReports, 0)
        const avgRisk = rows.length ? Math.round(rows.reduce((sum, patient) => sum + patient.risk, 0) / rows.length) : 0
        return { village, count: rows.length, highRisk, pendingReports, avgRisk, ...villages[village] }
    }), [patients, villages])

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

    const urgentAlerts = useMemo(() => patients.filter((patient) => patient.risk >= 60 || patient.flags.length > 0), [patients])
    const visitQueue = useMemo(() => [...patients].filter((patient) => patient.scheduledVisit).sort((a, b) => a.scheduledVisit.localeCompare(b.scheduledVisit)), [patients])
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
        const patient = {
            id: Date.now(),
            ...newPatient,
            age: Number(newPatient.age || 0),
            report_count: 0,
            risk: 18,
            riskHistory: [18, 18, 18, 18, 18],
            lastVisit: '',
            scheduledVisit: '',
            pendingReports: 0,
            followupStatus: 'scheduled',
            flags: [],
            householdId: newPatient.householdId || `HH-${newPatient.village.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-3)}`
        }
        setPatients((prev) => [patient, ...prev])
        setNewPatient({ name: '', age: '', gender: 'Female', blood_group: '', village: '', phone: '', householdId: '' })
        setShowAdd(false)
        setSelectedVillage(patient.village)
        setActiveTab('patients')
    }

    const addNewVillage = () => {
        const name = newVillageName.trim()
        if (!name || villages[name]) return
        const x = Math.floor(Math.random() * 80) + 10
        const y = Math.floor(Math.random() * 80) + 10
        setVillages((prev) => ({ ...prev, [name]: { x, y } }))
        setNewVillageName('')
        setSelectedVillage(name)
        setActiveTab('map')
    }

    const scheduleVisit = (id, date) => {
        setPatients((prev) => prev.map((patient) => patient.id === id ? { ...patient, scheduledVisit: date, followupStatus: 'scheduled' } : patient))
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
                <button className="btn btn-outline btn-sm" onClick={logout}>
                    <LogOut size={16} /> Logout
                </button>
            </div>

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
                            {Object.keys(villages).map((village) => <option key={village}>{village}</option>)}
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
                        <VisitPanel visits={visitQueue.slice(0, 5)} onSchedule={scheduleVisit} />
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
                <VisitPanel visits={visitQueue} onSchedule={scheduleVisit} expanded />
            )}

            {activeTab === 'outreach' && (
                <OutreachPanel alerts={urgentAlerts} visits={visitQueue} />
            )}

            {selectedPatient && (
                <PatientModal
                    patient={selectedPatient}
                    family={patients.filter((patient) => patient.householdId === selectedPatient.householdId)}
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
                                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{patient.village} | {patient.age}/{patient.gender[0]} | {patient.blood_group}</div>
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
                            <span>{riskLabel(patient.risk)} risk</span>
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
    return (
        <div className="glass-card">
            <h3 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={18} color="#06b6d4" /> Village Cluster Map
            </h3>
            <div style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: 8, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(16,185,129,0.08))', border: '1px solid var(--border-glass)' }}>
                <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <path d="M18 72 C35 56, 42 42, 62 28" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeDasharray="3 3" />
                    <path d="M62 28 C70 42, 76 52, 76 62" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeDasharray="3 3" />
                    <path d="M28 34 C38 45, 42 55, 48 68" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeDasharray="3 3" />
                </svg>
                {clusters.map((cluster) => {
                    const selected = selectedVillage === cluster.village
                    const size = 46 + Math.min(cluster.count * 9, 34)
                    return (
                        <button
                            key={cluster.village}
                            onClick={() => onSelect(cluster.village)}
                            title={`${cluster.village}: ${cluster.count} patients, ${cluster.highRisk} high risk`}
                            style={{
                                position: 'absolute',
                                left: `${cluster.x}%`,
                                top: `${cluster.y}%`,
                                transform: 'translate(-50%, -50%)',
                                width: size,
                                height: size,
                                borderRadius: '50%',
                                border: selected ? '3px solid #06b6d4' : '1px solid rgba(255,255,255,0.2)',
                                background: cluster.highRisk ? 'rgba(239,68,68,0.24)' : 'rgba(6,182,212,0.22)',
                                color: 'var(--text-primary)',
                                display: 'grid',
                                placeItems: 'center',
                                boxShadow: selected ? '0 0 0 8px rgba(6,182,212,0.12)' : 'none'
                            }}
                        >
                            <span style={{ fontWeight: 800 }}>{cluster.count}</span>
                        </button>
                    )
                })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 12 }}>
                {clusters.map((cluster) => (
                    <button key={cluster.village} className={`btn btn-sm ${selectedVillage === cluster.village ? 'btn-primary' : 'btn-outline'}`} onClick={() => onSelect(cluster.village)}>
                        {cluster.village} ({cluster.count})
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

function VisitPanel({ visits, onSchedule, expanded = false }) {
    return (
        <div className="glass-card">
            <h3 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarDays size={18} color="#f59e0b" /> Visit Scheduler
            </h3>
            <div style={{ display: 'grid', gap: 10 }}>
                {visits.map((visit) => (
                    <div key={visit.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'grid', gridTemplateColumns: expanded ? '1fr 170px' : '1fr', gap: 8, alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 700 }}>{visit.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{visit.village} | {visit.scheduledVisit} | {visit.followupStatus}</div>
                        </div>
                        {expanded && (
                            <input className="form-input" type="date" defaultValue={visit.scheduledVisit} onChange={(event) => onSchedule(visit.id, event.target.value)} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function OutreachPanel({ alerts, visits }) {
    const overdue = visits.filter((visit) => visit.followupStatus === 'overdue')
    return (
        <div className="grid-2 animate-in">
            <div className="glass-card">
                <h3 style={{ fontSize: 16, marginBottom: 12 }}>Priority Patients (High Risk/Flags)</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                    {alerts.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No priority patients.</div>}
                    {alerts.map(patient => (
                        <div key={patient.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{patient.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{patient.village} • Risk: {patient.risk}%</div>
                            </div>
                            <button className="btn btn-outline btn-sm"><Phone size={14} /> Contact</button>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="glass-card">
                <h3 style={{ fontSize: 16, marginBottom: 12 }}>Overdue Follow-ups</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                    {overdue.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No overdue follow-ups.</div>}
                    {overdue.map(patient => (
                        <div key={patient.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{patient.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{patient.village} • Due: {patient.scheduledVisit}</div>
                            </div>
                            <button className="btn btn-outline btn-sm"><Phone size={14} /> Contact</button>
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
                    </div>
                    <div style={{ color: riskColor(patient.risk), fontWeight: 900, fontSize: 24 }}>{patient.risk}%</div>
                </div>
                <div className="grid-3" style={{ gap: 10, marginBottom: 14 }}>
                    <MiniMetric label="Age/Gender" value={`${patient.age}/${patient.gender[0]}`} />
                    <MiniMetric label="Blood Group" value={patient.blood_group || 'N/A'} />
                    <MiniMetric label="Reports" value={patient.report_count} />
                </div>
                <div className="glass-card" style={{ padding: 14, marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, marginBottom: 8 }}>Family Members</h4>
                    <PatientMiniList patients={family} onSelect={() => {}} empty="No linked family members." />
                </div>
                <div className="glass-card" style={{ padding: 14, marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, marginBottom: 8 }}>Visit History</h4>
                    {patient.lastVisit ? (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8 }}>
                            <History size={16} color="var(--text-muted)" />
                            <div>
                                <div style={{ fontSize: 14 }}>Last Visit: {patient.lastVisit}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status: {patient.followupStatus}</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-muted)' }}>No previous visits recorded.</div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input className="form-input" type="date" defaultValue={patient.scheduledVisit} onChange={(event) => onSchedule(patient.id, event.target.value)} style={{ maxWidth: 180 }} />
                    <button className="btn btn-outline"><Phone size={14} /> Call</button>
                    <button className="btn btn-outline"><Route size={14} /> Add To Route</button>
                    <button className="btn btn-outline"><AlertTriangle size={14} /> Flag</button>
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
