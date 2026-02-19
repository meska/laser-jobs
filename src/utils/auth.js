import PouchDB from 'pouchdb'
import localforage from 'localforage'

const SESSION_COOKIE = 'laserjobs_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 365
const USERS_DB = 'laserjobs_users'
const DEFAULT_PASSWORD_ITERATIONS = 120000

export function getDbSettings() {
    return localforage.getItem('dbSettings').then((settings) => {
        if (settings && settings.serverLogin && settings.serverPassword) {
            return settings
        }
        return null
    })
}

export function setDbSettings(dbSettings) {
    return localforage.setItem('dbSettings', dbSettings)
}

export function clearDbSettings() {
    return localforage.removeItem('dbSettings')
}

export function buildAuthenticatedDbUrl(baseUrl, dbSettings) {
    const normalizedBaseUrl = normalizeDbBaseUrl(baseUrl)
    const url = /^https?:\/\//.test(normalizedBaseUrl)
        ? new URL(normalizedBaseUrl)
        : new URL(normalizedBaseUrl, window.location.origin)
    if (dbSettings && dbSettings.serverLogin && dbSettings.serverPassword) {
        url.username = dbSettings.serverLogin
        url.password = dbSettings.serverPassword
    }
    return url.toString()
}

export function buildDbEndpoint(baseUrl, dbName) {
    return `${normalizeDbBaseUrl(baseUrl)}${dbName}`
}

function normalizeDbBaseUrl(baseUrl) {
    const raw = (baseUrl || '').trim()
    if (!raw) {
        return '/'
    }
    return raw.endsWith('/') ? raw : `${raw}/`
}

export async function authenticateUser({ baseUrl, username, azienda, password }) {
    try {
        const dbSettings = { serverLogin: username, serverPassword: password }
        const readAttempt = await readUserDoc({
            baseUrl,
            username,
            dbSettings,
            azienda,
        })
        const user = readAttempt.user
        const readError = readAttempt.error

        if (!user) {
            if (readError && readError.status === 401) {
                return { ok: false, errorCode: 'SERVER_AUTH_INVALID' }
            }
            if (readError && readError.status === 404) {
                return { ok: false, errorCode: 'USER_NOT_FOUND' }
            }
            return { ok: false, errorCode: 'AUTH_READ_ERROR' }
        }

        console.info('[Auth] Utente trovato', {
            id: user._id,
            azienda: user.azienda,
            livello: user.livello,
            hasPasswordHash: Boolean(user.password_hash),
            hasLegacyPassword: typeof user.password === 'string',
        })
        const normalizedLevel = user.livello === 'editor' ? 'editor' : 'viewer'
        const validPassword = await verifyUserPassword(user, password, {
            trustServerAuth: Boolean(readAttempt.serverAuthenticated),
        })
        if (!validPassword) {
            console.warn('[Auth] Password non valida per utente', username)
            return { ok: false, errorCode: 'INVALID_CREDENTIALS' }
        }
        if (azienda && user.azienda !== azienda) {
            console.warn('[Auth] Azienda non coerente per utente', {
                username,
                aziendaInput: azienda,
                aziendaUser: user.azienda,
            })
            return { ok: false, errorCode: 'AZIENDA_MISMATCH' }
        }
        if (!user.azienda) {
            console.warn('[Auth] Utente senza campo azienda', username)
            return { ok: false, errorCode: 'MISSING_AZIENDA' }
        }
        console.info('[Auth] Autenticazione completata con successo', {
            username,
            azienda: azienda || user.azienda,
            livello: normalizedLevel,
        })
        return {
            ok: true,
            dbSettings,
            user: {
                utente: user.utente || username,
                azienda: azienda || user.azienda,
                livello: normalizedLevel,
            },
        }
    } catch (error) {
        console.error('[Auth] Errore durante autenticazione', {
            username,
            status: error && error.status,
            name: error && error.name,
            reason: error && error.reason,
            message: error && error.message,
        })
        return { ok: false, errorCode: 'AUTH_EXCEPTION' }
    }
}

async function readUserDoc({ baseUrl, username, dbSettings, azienda }) {
    const authUrl = buildAuthenticatedDbUrl(baseUrl, dbSettings)
    const usersEndpoint = buildDbEndpoint(authUrl, USERS_DB)
    const usersDb = new PouchDB(usersEndpoint)

    console.info('[Auth] Avvio autenticazione', {
        username,
        azienda,
        baseUrl,
        authUrl,
        usersEndpoint,
    })

    try {
        const user = await usersDb.get(username)
        return { user, error: null, serverAuthenticated: true }
    } catch (error) {
        return { user: null, error, serverAuthenticated: false }
    } finally {
        usersDb.close()
    }
}

async function verifyUserPassword(user, password, { trustServerAuth = false } = {}) {
    if (user.password_hash && user.password_salt) {
        const iterations = Number(user.password_iterations) || DEFAULT_PASSWORD_ITERATIONS
        const hash = await pbkdf2Sha256Hex(password, user.password_salt, iterations)
        if (!hash) {
            if (trustServerAuth) {
                console.warn('[Auth] PBKDF2 non disponibile nel browser, uso autenticazione server gia valida')
                return true
            }
            console.warn('[Auth] Impossibile calcolare hash PBKDF2 nel browser')
            return false
        }
        console.info('[Auth] Verifica password hash', {
            iterations,
            saltLength: user.password_salt.length,
            hashMatch: hash === user.password_hash,
        })
        return hash === user.password_hash
    }

    // Compatibilita con utenti legacy salvati in chiaro.
    if (typeof user.password === 'string') {
        console.info('[Auth] Verifica password legacy in chiaro')
        return user.password === password
    }

    console.warn('[Auth] Nessun formato password valido trovato nel documento utente')
    return false
}

async function pbkdf2Sha256Hex(password, salt, iterations) {
    if (!window.crypto || !window.crypto.subtle) {
        console.error('[Auth] window.crypto.subtle non disponibile', {
            hasCrypto: Boolean(window.crypto),
            protocol: window.location && window.location.protocol,
            hostname: window.location && window.location.hostname,
        })
        return null
    }

    const encoder = new TextEncoder()
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits'],
    )

    const derivedBits = await window.crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations,
            hash: 'SHA-256',
        },
        keyMaterial,
        256,
    )

    return toHex(derivedBits)
}

function toHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
}

function encodeSession(session) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(session))))
}

function decodeSession(value) {
    try {
        return JSON.parse(decodeURIComponent(escape(atob(value))))
    } catch (error) {
        return null
    }
}

export function setSessionCookie(session) {
    const payload = encodeSession(session)
    document.cookie = `${SESSION_COOKIE}=${payload}; Max-Age=${SESSION_MAX_AGE}; Path=/; SameSite=Lax`
}

export function getSessionCookie() {
    const match = document.cookie
        .split('; ')
        .find((part) => part.startsWith(`${SESSION_COOKIE}=`))

    if (!match) {
        return null
    }

    const raw = match.substring(`${SESSION_COOKIE}=`.length)
    const session = decodeSession(raw)

    if (!session || !session.utente || !session.azienda || !session.livello) {
        return null
    }

    return session
}

export function clearSessionCookie() {
    document.cookie = `${SESSION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`
}

export function getDefaultRouteForSession(session) {
    if (!session || !session.azienda) {
        return '/login'
    }
    if (session.livello === 'editor') {
        return `/${session.azienda}/edit`
    }
    return `/${session.azienda}`
}
