import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { clearHealthSync } from './utils/healthSync'

const AuthContext = createContext(null)

const BACKEND_DOWN_MSG = 'Backend is not responding. Double-click run.bat in the project folder, wait for both server windows to open, then refresh this page.'

async function readApiResponse(res, fallbackMessage) {
    const text = await res.text()
    if (!text) {
        if (!res.ok) {
            if (res.status === 401) throw new Error('Invalid email or password')
            if (res.status === 404) throw new Error('API endpoint not found. Restart run.bat and try again.')
            if (res.status >= 502) throw new Error(fallbackMessage)
            throw new Error(`Request failed (${res.status})`)
        }
        return {}
    }

    try {
        return JSON.parse(text)
    } catch {
        if (!res.ok) throw new Error(fallbackMessage)
        throw new Error('Unexpected server response')
    }
}

async function apiFetch(url, options = {}, fallbackMessage = BACKEND_DOWN_MSG) {
    let res
    try {
        res = await fetch(url, options)
    } catch {
        throw new Error(fallbackMessage)
    }
    const data = await readApiResponse(res, fallbackMessage)
    return { res, data }
}

export async function checkBackendHealth() {
    try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!res.ok) return false
        const data = await res.json()
        return data?.status === 'ok'
    } catch {
        return false
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
            const { res, data } = await apiFetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
            }, 'Could not read profile. Please restart the backend (run.bat).')
            if (res.ok) {
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

        const { res, data } = await apiFetch(endpoint, { method: 'POST', body: formData })

        if (mode === 'asha' && res.status === 404) {
            throw new Error('ASHA login endpoint not found. Restart backend (run.bat) and try again.')
        }

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

        const { res, data } = await apiFetch('/api/auth/register', { method: 'POST', body: formData })
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
        const { res, data } = await apiFetch('/api/auth/profile', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        })
        if (res.ok) setUser(data.user)
        return data
    }

    const uploadPhoto = async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        const { res, data } = await apiFetch('/api/auth/upload-photo', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        })
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
