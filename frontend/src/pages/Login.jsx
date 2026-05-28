import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(localStorage.getItem('hm_remember_me') === 'true')
    const [showPass, setShowPass] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

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
            await login(email, password)

            // Persist email if rememberMe is checked
            if (rememberMe) {
                localStorage.setItem('hm_remembered_email', email)
                localStorage.setItem('hm_remember_me', 'true')
            } else {
                localStorage.removeItem('hm_remembered_email')
                localStorage.setItem('hm_remember_me', 'false')
            }

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

                    <div className="auth-options">
                        <label className="remember-me">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={e => setRememberMe(e.target.checked)}
                            />
                            <span>Remember Me</span>
                        </label>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg auth-btn" disabled={loading}>
                        {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Signing in...</> : <><LogIn size={18} /> Sign In</>}
                    </button>
                </form>

                <div className="auth-footer">
                    Don't have an account? <Link to="/signup">Create Account</Link>
                </div>
            </div>
        </div>
    )
}
