// Simple session management for Farcaster profile
const SESSION_KEY = 'farcaster_profile'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface FarcasterProfile {
  fid: number
  username: string
  displayName?: string
  pfpUrl?: string
  bio?: string
  custody?: string
  verifications?: string[]
  timestamp: number
}

export const sessionManager = {
  save(profile: Omit<FarcasterProfile, 'timestamp'>): void {
    const session: FarcasterProfile = {
      ...profile,
      timestamp: Date.now(),
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  },

  load(): FarcasterProfile | null {
    try {
      const data = localStorage.getItem(SESSION_KEY)
      if (!data) return null

      const session: FarcasterProfile = JSON.parse(data)
      const age = Date.now() - session.timestamp

      if (age > SESSION_MAX_AGE) {
        this.clear()
        return null
      }

      return session
    } catch (error) {
      this.clear()
      return null
    }
  },

  clear(): void {
    localStorage.removeItem(SESSION_KEY)
  },

  isValid(): boolean {
    return this.load() !== null
  },
}
