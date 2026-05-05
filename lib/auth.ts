const AUTH_KEY = 'hr_auth_exp'
const SETTINGS_KEY = 'hr_settings_unlocked'
const SESSION_MS = 3 * 60 * 60 * 1000 // 3시간

export function login(username: string, password: string) {
  return username === 'admin' && password === 'hradmin'
}

export function setSession() {
  localStorage.setItem(AUTH_KEY, String(Date.now() + SESSION_MS))
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  const exp = localStorage.getItem(AUTH_KEY)
  return !!exp && Date.now() < Number(exp)
}

export function clearSession() {
  localStorage.removeItem(AUTH_KEY)
  sessionStorage.removeItem(SETTINGS_KEY)
}

export function verifyPassword(password: string) {
  return password === 'hradmin'
}

export function unlockSettings() {
  sessionStorage.setItem(SETTINGS_KEY, '1')
}

export function isSettingsUnlocked(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(SETTINGS_KEY) === '1'
}
