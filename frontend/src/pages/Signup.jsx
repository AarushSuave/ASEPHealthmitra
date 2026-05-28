import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { UserPlus, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react'

export default function Signup() {
    const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', age: '', gender: '', blood_group: '' })
    const [showPass, setShowPass] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { register } = useAuth()
    const navigate = useNavigate()

    const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.name || !form.email || !form.password) return setError('Name, email, and password are required')
        if (form.password.length < 6) return setError('Password must be at least 6 characters')
        setLoading(true)
        setError('')
        try {
            await register(form)
            navigate('/')
        } catch (err) {
            setError(err.message)
        }
        setLoading(false)
    }

    return (
        <div className="auth-page">
            <div className="auth-bg"></div>
            <div className="auth-card auth-card-wide animate-in">
                <div className="auth-logo">
                    <div className="auth-logo-icon">🏥</div>
                    <h1>HealthMitra</h1>
                    <p>AI Health Scan</p>
                </div>

                <h2 className="auth-title">Create Account</h2>
                <p className="auth-subtitle">Join HealthMitra for personalized AI health insights</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-row">
                        <div className="auth-field">
                            <User size={18} className="auth-field-icon" />
                            <input placeholder="Full Name *" value={form.name} onChange={e => update('name', e.target.value)} />
                        </div>
                        <div className="auth-field">
                            <Mail size={18} className="auth-field-icon" />
                            <input type="email" placeholder="Email *" value={form.email} onChange={e => update('email', e.target.value)} autoComplete="email" />
                        </div>
                    </div>

                    <div className="auth-row">
                        <div className="auth-field">
                            <Lock size={18} className="auth-field-icon" />
                            <input type={showPass ? 'text' : 'password'} placeholder="Password *" value={form.password} onChange={e => update('password', e.target.value)} autoComplete="new-password" />
                            <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <div className="auth-field">
                            <Phone size={18} className="auth-field-icon" />
                            <input placeholder="Phone Number" value={form.phone} onChange={e => update('phone', e.target.value)} />
                        </div>
                    </div>

                    <div className="auth-row auth-row-3">
                        <div className="auth-field">
                            <input type="number" placeholder="Age" value={form.age} onChange={e => update('age', e.target.value)} min="1" max="120" />
                        </div>
                        <div className="auth-field">
                            <select value={form.gender} onChange={e => update('gender', e.target.value)}>
                                <option value="">Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="auth-field">
                            <select value={form.blood_group} onChange={e => update('blood_group', e.target.value)}>
                                <option value="">Blood Group</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg auth-btn" disabled={loading}>
                        {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Creating Account...</> : <><UserPlus size={18} /> Create Account</>}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign In</Link>
                </div>
            </div>
        </div>
    )
}
