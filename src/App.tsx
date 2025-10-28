import { useState, useEffect } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { AuthKitProvider, useProfile } from '@farcaster/auth-kit'
import sdk from '@farcaster/frame-sdk'
import TradingInterface from './components/TradingInterface'
import ProfileComponent from './components/Profile'
import Leaderboard from './components/Leaderboard'
import FarcasterAuth from './components/FarcasterAuth'
import { sessionManager } from './lib/sessionManager'
import '@farcaster/auth-kit/styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'FARCASTER_AUTH_CACHE',
})

const authKitConfig = {
  rpcUrl: 'https://mainnet.optimism.io',
  domain: window.location.hostname,
  siweUri: window.location.origin,
  relay: 'https://relay.farcaster.xyz',
}

// Debug: Log configuration and check for stored auth data
console.log('AuthKit Config:', authKitConfig)
console.log('LocalStorage keys:', Object.keys(localStorage))
console.log('LocalStorage farcaster data:', Object.keys(localStorage).filter(k => k.includes('farcaster') || k.includes('auth')).map(k => ({ key: k, value: localStorage.getItem(k)?.substring(0, 100) })))

function AppContent() {
  const { isAuthenticated, profile } = useProfile()
  const [currentPage, setCurrentPage] = useState<'home' | 'trading' | 'profile' | 'leaderboard'>('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [restoredProfile, setRestoredProfile] = useState<any>(null)
  const [frameContext, setFrameContext] = useState<any>(null)

  // Debug: Log authentication state changes
  console.log('AppContent render - isAuthenticated:', isAuthenticated, 'profile:', profile, 'restored:', restoredProfile, 'frameContext:', frameContext)

  // Check for Farcaster Frame context (mobile app)
  useEffect(() => {
    const checkFrameContext = async () => {
      try {
        const context = await sdk.context
        console.log('📱 Frame SDK Context:', context)
        if (context?.user) {
          setFrameContext({
            fid: context.user.fid,
            username: context.user.username,
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl,
          })
          // Save to session
          sessionManager.save({
            fid: context.user.fid,
            username: context.user.username || '',
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl,
          })
        }
      } catch (error) {
        console.log('Not in Farcaster frame context:', error)
      }
    }
    checkFrameContext()
  }, [])

  // Save session when user authenticates
  useEffect(() => {
    if (isAuthenticated && profile) {
      sessionManager.save({
        fid: profile.fid || 0,
        username: profile.username || '',
        displayName: profile.displayName,
        pfpUrl: profile.pfpUrl,
        bio: profile.bio,
        custody: profile.custody,
        verifications: profile.verifications,
      })
    }
  }, [isAuthenticated, profile])

  // Restore session on mount
  useEffect(() => {
    if (!isAuthenticated && !profile) {
      const savedSession = sessionManager.load()
      if (savedSession) {
        console.log('🔄 Restoring session from localStorage')
        setRestoredProfile(savedSession as any)
      }
    }
  }, [isAuthenticated, profile])

  // Clear session on explicit logout
  useEffect(() => {
    if (!isAuthenticated && !profile && restoredProfile) {
      // User explicitly logged out
      sessionManager.clear()
      setRestoredProfile(null)
    }
  }, [isAuthenticated, profile, restoredProfile])

  // Use frame context first (mobile app), then AuthKit profile, then restored profile
  const activeProfile = frameContext || profile || restoredProfile
  const isLoggedIn = !!frameContext || isAuthenticated || !!restoredProfile

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#090a0f] via-[#0a0b10] to-[#0b0c11] text-white">
      {/* Modern Navigation with Glassmorphism */}
      <nav className="border-b border-gray-700/30 bg-gradient-to-r from-[#0f1117]/80 to-[#0a0c12]/80 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center gap-4">
              {/* Hamburger Menu (Mobile Only - when authenticated) */}
              {isLoggedIn && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden flex flex-col gap-1.5 w-6 h-6 justify-center"
                >
                  <span className="w-full h-0.5 bg-white transition-all"></span>
                  <span className="w-full h-0.5 bg-white transition-all"></span>
                  <span className="w-full h-0.5 bg-white transition-all"></span>
                </button>
              )}

              {/* Logo */}
              <button
                onClick={() => setCurrentPage('home')}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-lg flex items-center justify-center">
                  <span className="text-lg">⚡</span>
                </div>
                <span className="font-bold text-lg hidden sm:inline">
                  <span className="bg-gradient-to-r from-[#0000FF] to-[#4444FF] bg-clip-text text-transparent">Based</span> Traders
                </span>
              </button>

              {/* Desktop Navigation Tabs (only when authenticated) */}
              {isLoggedIn && (
                <div className="hidden lg:flex gap-2 ml-4">
                  <button
                    onClick={() => setCurrentPage('trading')}
                    className={`py-2 px-4 border-b-2 transition-all duration-300 font-medium ${
                      currentPage === 'trading'
                        ? 'border-[#0000FF] text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>📈</span>
                      Trading
                    </span>
                  </button>
                  <button
                    onClick={() => setCurrentPage('profile')}
                    className={`py-2 px-4 border-b-2 transition-all duration-300 font-medium ${
                      currentPage === 'profile'
                        ? 'border-[#0000FF] text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>👤</span>
                      Profile
                    </span>
                  </button>
                  <button
                    onClick={() => setCurrentPage('leaderboard')}
                    className={`py-2 px-4 border-b-2 transition-all duration-300 font-medium ${
                      currentPage === 'leaderboard'
                        ? 'border-[#0000FF] text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🏆</span>
                      Leaderboard
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Right side - Auth */}
            <div className="flex items-center gap-3">
              {isLoggedIn && activeProfile ? (
                <div className="flex items-center gap-2 bg-gradient-to-br from-[#8a63d2] to-[#6a4bb5] px-2 py-1 rounded-lg border border-purple-400/30 lg:px-3 lg:py-2">
                  {activeProfile.pfpUrl && (
                    <img
                      src={activeProfile.pfpUrl}
                      alt={activeProfile.username}
                      className="w-6 h-6 rounded-full lg:w-7 lg:h-7"
                    />
                  )}
                  <span className="text-xs font-semibold text-white hidden sm:inline lg:text-sm">
                    @{activeProfile.username}
                  </span>
                </div>
              ) : (
                <FarcasterAuth />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Side Menu (only when authenticated) */}
      {isLoggedIn && mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-br from-[#0f1117] to-[#0a0c12] border-r border-gray-700/50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold mb-6 text-gray-400">Menu</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setCurrentPage('trading')
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left py-3 px-4 rounded-lg transition-all ${
                    currentPage === 'trading'
                      ? 'bg-[#0000FF]/20 text-white border border-[#0000FF]/50'
                      : 'text-gray-400 hover:text-white hover:bg-[#0a0c12]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">📈</span>
                    <span className="font-medium">Trading</span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    setCurrentPage('profile')
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left py-3 px-4 rounded-lg transition-all ${
                    currentPage === 'profile'
                      ? 'bg-[#0000FF]/20 text-white border border-[#0000FF]/50'
                      : 'text-gray-400 hover:text-white hover:bg-[#0a0c12]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">👤</span>
                    <span className="font-medium">Profile</span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    setCurrentPage('leaderboard')
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left py-3 px-4 rounded-lg transition-all ${
                    currentPage === 'leaderboard'
                      ? 'bg-[#0000FF]/20 text-white border border-[#0000FF]/50'
                      : 'text-gray-400 hover:text-white hover:bg-[#0a0c12]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">🏆</span>
                    <span className="font-medium">Leaderboard</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Content - Pass restored profile to components */}
      {!isLoggedIn || currentPage === 'home' ? (
        <TradingInterface overrideProfile={restoredProfile} />
      ) : currentPage === 'trading' ? (
        <TradingInterface overrideProfile={restoredProfile} />
      ) : currentPage === 'profile' ? (
        <ProfileComponent overrideProfile={restoredProfile} />
      ) : (
        <Leaderboard />
      )}
    </div>
  )
}

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
      }}
      onSuccess={() => {
        console.log('✅ Query cache restored from localStorage')
      }}
    >
      <AuthKitProvider config={authKitConfig}>
        <AppContent />
      </AuthKitProvider>
    </PersistQueryClientProvider>
  )
}

export default App
