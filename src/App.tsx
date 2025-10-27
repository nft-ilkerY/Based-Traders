import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthKitProvider, useProfile } from '@farcaster/auth-kit'
import TradingInterface from './components/TradingInterface'
import Profile from './components/Profile'
import Leaderboard from './components/Leaderboard'
import FarcasterAuth from './components/FarcasterAuth'
import '@farcaster/auth-kit/styles.css'

const queryClient = new QueryClient()

const authKitConfig = {
  rpcUrl: 'https://mainnet.optimism.io',
  domain: window.location.host,
  siweUri: window.location.origin,
}

// Debug: Log configuration
console.log('AuthKit Config:', authKitConfig)

function AppContent() {
  const { isAuthenticated, profile } = useProfile()
  const [currentPage, setCurrentPage] = useState<'home' | 'trading' | 'profile' | 'leaderboard'>('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#090a0f] via-[#0a0b10] to-[#0b0c11] text-white">
      {/* Modern Navigation with Glassmorphism */}
      <nav className="border-b border-gray-700/30 bg-gradient-to-r from-[#0f1117]/80 to-[#0a0c12]/80 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center gap-4">
              {/* Hamburger Menu (Mobile Only - when authenticated) */}
              {isAuthenticated && (
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
              {isAuthenticated && (
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
              {isAuthenticated && profile ? (
                <div className="flex items-center gap-2 bg-gradient-to-br from-[#8a63d2] to-[#6a4bb5] px-2 py-1 rounded-lg border border-purple-400/30 lg:px-3 lg:py-2">
                  {profile.pfpUrl && (
                    <img
                      src={profile.pfpUrl}
                      alt={profile.username}
                      className="w-6 h-6 rounded-full lg:w-7 lg:h-7"
                    />
                  )}
                  <span className="text-xs font-semibold text-white hidden sm:inline lg:text-sm">
                    @{profile.username}
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
      {isAuthenticated && mobileMenuOpen && (
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

      {/* Page Content */}
      {!isAuthenticated || currentPage === 'home' ? (
        <TradingInterface />
      ) : currentPage === 'trading' ? (
        <TradingInterface />
      ) : currentPage === 'profile' ? (
        <Profile />
      ) : (
        <Leaderboard />
      )}
    </div>
  )
}

function App() {
  return (
    <AuthKitProvider config={authKitConfig}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </AuthKitProvider>
  )
}

export default App
