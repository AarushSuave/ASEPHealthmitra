import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth, checkBackendHealth } from '../AuthContext'
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(localStorage.getItem('hm_remember_me') === 'true')
    const [showPass, setShowPass] = useState(false)
    const [loginRole, setLoginRole] = useState('user') // user | asha
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [backendOk, setBackendOk] = useState(null)
    const { login } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        checkBackendHealth().then(setBackendOk)
        const id = setInterval(() => checkBackendHealth().then(setBackendOk), 8000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        if (rememberMe) {
            const savedEmail = localStorage.getItem('hm_remembered_email')
            if (savedEmail) setEmail(savedEmail)
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email || !password) return setError('Please fill in all fields')
        setLoading(true)
        setError('')
        try {
            await login(email, password, loginRole)

            if (rememberMe) {
                localStorage.setItem('hm_remembered_email', email)
                localStorage.setItem('hm_remember_me', 'true')
            } else {
                localStorage.removeItem('hm_remembered_email')
                localStorage.setItem('hm_remember_me', 'false')
            }
            localStorage.setItem('hm_login_mode', loginRole)

            navigate('/')
        } catch (err) {
            setError(err.message)
        }
        setLoading(false)
    }

    return (
        <div className="auth-page">
            <div className="auth-bg"></div>
            <div className="auth-card animate-in">
                <div className="auth-logo">
                    <div className="auth-logo-icon">🏥</div>
                    <h1>HealthMitra</h1>
                    <p>AI Health Scan</p>
                </div>

                <h2 className="auth-title">Welcome Back</h2>
                <p className="auth-subtitle">Sign in to access your health dashboard</p>

                {backendOk === false && (
                    <div className="auth-error" style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.4)', color: '#fbbf24' }}>
                        Backend offline — run <strong>run.bat</strong> from the project folder, then refresh.
                    </div>
                )}

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <Mail size={18} className="auth-field-icon" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                    </div>

                    <div className="auth-field">
                        <Lock size={18} className="auth-field-icon" />
                        <input
                            type={showPass ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                        <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <label className="remember-me" style={{ marginBottom: 16 }}>
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={e => setRememberMe(e.target.checked)}
                        />
                        <span>Remember Me / याद रखें</span>
                    </label>

                    <div className="auth-role-toggle" aria-label="Choose login type">
                        <button
                            type="button"
                            className={`role-pill ${loginRole === 'user' ? 'active' : ''}`}
                            onClick={() => setLoginRole('user')}
                        >
                            User उपयोगकर्ता
                        </button>
                        <button
                            type="button"
                            className={`role-pill ${loginRole === 'asha' ? 'active' : ''}`}
                            onClick={() => setLoginRole('asha')}
                        >
                            ASHA समन्वयक
                        </button>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg auth-btn" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: 18, height: 18 }} /> Signing in...
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                {loginRole === 'asha' ? ' ASHA Login / आशा' : ' Login / लॉगिन'}
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    {loginRole === 'asha' && 'ASHA coordinator credentials are read from asha_credentials.txt'}
                    {loginRole === 'user' && (
                        <>
                            User credentials are read from user_credentials.txt.
                            <br />
                            Need an account? <Link to="/signup">Create Account / नया खाता बनाएँ</Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
