import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { clearHealthSync } from './utils/healthSync'

const AuthContext = createContext(null)

async function readApiResponse(res, fallbackMessage) {
    const text = await res.text()
    if (!text) {
        if (!res.ok) throw new Error(fallbackMessage)
        return {}
    }

    try {
        return JSON.parse(text)
    } catch {
        throw new Error(fallbackMessage)
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem('hm_token'))
    const [loading, setLoading] = useState(true)
    const previousUserId = useRef(null)

    useEffect(() => {
        if (token) {
            fetchProfile()
        } else {
            setLoading(false)
        }
    }, [])

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await readApiResponse(res, 'Could not read profile. Please restart the backend.')
                setUser(data)
                previousUserId.current = data.id ?? null
            } else {
                logout()
            }
        } catch {
            logout()
        }
        setLoading(false)
    }

    const login = async (email, password, mode = 'user') => {
        const formData = new FormData()
        formData.append('email', email)
        formData.append('password', password)

        let endpoint = '/api/auth/login'
        if (mode === 'asha') endpoint = '/api/auth/asha-login'

        const res = await fetch(endpoint, { method: 'POST', body: formData })

        if (mode === 'asha' && res.status === 404) {
            throw new Error('Special login endpoint not found. Restart backend (run.bat) and try again.')
        }

        const data = await readApiResponse(res, 'Backend is not responding. Start run.bat and try again.')

        if (!res.ok) throw new Error(data.detail || 'Login failed')

        if (previousUserId.current && previousUserId.current !== data.user?.id) {
            clearHealthSync(previousUserId.current)
        }
        localStorage.removeItem('hm_health_sync')
        localStorage.setItem('hm_token', data.token)
        setToken(data.token)
        setUser(data.user)
        previousUserId.current = data.user?.id ?? null
        return data
    }

    const register = async (formFields) => {
        const formData = new FormData()
        Object.entries(formFields).forEach(([k, v]) => {
            if (v) formData.append(k, v)
        })

        const res = await fetch('/api/auth/register', { method: 'POST', body: formData })
        const data = await readApiResponse(res, 'Backend is not responding. Start run.bat and try again.')

        if (!res.ok) throw new Error(data.detail || 'Registration failed')

        localStorage.removeItem('hm_health_sync')
        localStorage.setItem('hm_token', data.token)
        setToken(data.token)
        setUser(data.user)
        previousUserId.current = data.user?.id ?? null
        return data
    }

    const logout = () => {
        if (user?.id) clearHealthSync(user.id)
        localStorage.removeItem('hm_token')
        localStorage.removeItem('hm_login_mode')
        localStorage.removeItem('hm_health_sync')
        setToken(null)
        setUser(null)
        previousUserId.current = null
    }

    const updateProfile = async (fields) => {
        const formData = new FormData()
        Object.entries(fields).forEach(([k, v]) => {
            if (v !== undefined && v !== null) formData.append(k, v)
        })
        const res = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        })
        const data = await readApiResponse(res, 'Backend is not responding. Start run.bat and try again.')
        if (res.ok) setUser(data.user)
        return data
    }

    const uploadPhoto = async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/auth/upload-photo', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        })
        const data = await readApiResponse(res, 'Backend is not responding. Start run.bat and try again.')
        if (res.ok) {
            setUser(prev => ({ ...prev, profile_photo: data.profile_photo }))
        }
        return data
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, uploadPhoto, fetchProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
