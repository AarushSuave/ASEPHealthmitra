import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext(null)

const STORAGE_KEY = 'hm_language'

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved === 'hi' ? 'hi' : 'en'
    })

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, lang)
        document.documentElement.lang = lang === 'hi' ? 'hi' : 'en'
    }, [lang])

    const toggleHindi = () => setLang(prev => prev === 'hi' ? 'en' : 'hi')
    const t = (en, hi) => (lang === 'hi' ? hi : en)

    return (
        <LanguageContext.Provider value={{ lang, setLang, toggleHindi, t, isHindi: lang === 'hi' }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const ctx = useContext(LanguageContext)
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
    return ctx
}
