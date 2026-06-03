/** Per-user health cache (scoped by account so new logins start fresh). */

const STORAGE_PREFIX = 'hm_health_sync_'

function storageKey(userId) {
    return userId ? `${STORAGE_PREFIX}${userId}` : null
}

export function getHealthSync(userId) {
    const key = storageKey(userId)
    if (!key) return {}
    try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

function writeHealthSync(userId, data) {
    const key = storageKey(userId)
    if (!key) return
    localStorage.setItem(key, JSON.stringify({
        ...data,
        updatedAt: new Date().toISOString(),
    }))
    window.dispatchEvent(new CustomEvent('hm-health-updated', { detail: { userId, data } }))
}

export function saveVitalsAndRisk(userId, vitals, riskResult) {
    const prev = getHealthSync(userId)
    writeHealthSync(userId, {
        ...prev,
        vitals: { ...vitals, savedAt: new Date().toISOString() },
        risk: riskResult ? {
            diabetes_risk: riskResult.diabetes_risk,
            diabetes_level: riskResult.diabetes_level,
            heart_risk: riskResult.heart_risk,
            heart_level: riskResult.heart_level,
            recommendations: riskResult.recommendations || [],
            combined_risk: Math.round((riskResult.diabetes_risk + riskResult.heart_risk) / 2),
            savedAt: new Date().toISOString(),
        } : prev.risk,
    })
}

export function saveLatestReport(userId, reportPayload) {
    const prev = getHealthSync(userId)
    const report = reportPayload?.report || reportPayload
    const riskScore = report?.risk_scores?.cardiovascular?.score
        ?? reportPayload?.risk_score
        ?? null
    const riskLevel = report?.risk_scores?.cardiovascular?.level
        ?? reportPayload?.risk_level
        ?? null

    writeHealthSync(userId, {
        ...prev,
        latestReport: {
            filename: reportPayload?.filename || report?.filename || 'Medical report',
            risk_score: riskScore,
            risk_level: riskLevel,
            red_flags_count: report?.red_flags?.length ?? 0,
            scannedAt: new Date().toISOString(),
            summary: report?.summary || reportPayload?.explanation_en?.slice?.(0, 200) || '',
        },
    })
}

export function clearHealthSync(userId) {
    if (userId) {
        localStorage.removeItem(storageKey(userId))
    }
    // Remove legacy global key from older builds
    localStorage.removeItem('hm_health_sync')
    window.dispatchEvent(new CustomEvent('hm-health-updated', { detail: { userId, data: {} } }))
}

export function clearAllHealthSyncCaches() {
    Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(STORAGE_PREFIX) || key === 'hm_health_sync') {
            localStorage.removeItem(key)
        }
    })
}
